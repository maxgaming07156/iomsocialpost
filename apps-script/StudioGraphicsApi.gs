/**
 * INSIDETHEIOM STUDIO — PHASE 3 & 4 WRITE API EXTENSION
 *
 * Add/replace this as StudioGraphicsApi.gs alongside Code.gs and StudioApi.gs.
 *
 * - Preserves all existing functions in Code.gs and StudioApi.gs
 * - Validates STUDIO_API_SECRET from Script Properties on every POST
 * - Safely appends missing optional columns (supporting_text, rejection_reason, updated_at)
 *   without deleting, renaming, or overwriting existing columns or data
 * - Never overwrites NEWS records
 * - Never triggers or enables social media publishing
 */

var ALLOWED_POST_STATUSES = {
  DRAFT: true,
  NEEDS_REVIEW: true,
  APPROVED: true,
  REJECTED: true
};

function doPost(e) {
  try {
    var rawBody = (e && e.postData && e.postData.contents) ? e.postData.contents : '{}';
    var payload = JSON.parse(rawBody);

    var providedSecret = String(payload.secret || '');
    var expectedSecret = PropertiesService
      .getScriptProperties()
      .getProperty('STUDIO_API_SECRET');

    if (!expectedSecret) {
      return studioPostJson_({
        ok: false,
        error: 'STUDIO_API_SECRET is not configured in Script Properties.'
      });
    }

    if (!providedSecret || providedSecret !== expectedSecret) {
      return studioPostJson_({
        ok: false,
        error: 'Unauthorized request.'
      });
    }

    var action = String(payload.action || '').trim();

    switch (action) {
      case 'save_graphic':
        return handleSaveGraphic_(payload);
      case 'update_post':
        return handleUpdatePost_(payload);
      case 'upsert_post_for_article':
        return handleUpsertPostForArticle_(payload);
      case 'set_post_status':
        return handleSetPostStatus_(payload);
      case 'enqueue_post':
        return handleEnqueuePost_(payload);
      case 'update_queue_schedule':
        return handleUpdateQueueSchedule_(payload);
      case 'record_publish_result':
        return handleRecordPublishResult_(payload);
      default:
        return studioPostJson_({
          ok: false,
          error: 'Unsupported POST action: ' + action
        });
    }
  } catch (error) {
    return studioPostJson_({
      ok: false,
      error: error && error.message ? error.message : 'Apps Script write error.'
    });
  }
}

/* =====================================================
   1. SAVE GRAPHIC (PHASE 3)
===================================================== */

function handleSaveGraphic_(payload) {
  var postId = String(payload.post_id || '').trim();
  var fileName = String(payload.file_name || '').trim() || ('insidetheiom-' + postId + '.png');
  var base64Data = String(payload.base64_data || '').trim();

  if (!postId || !base64Data) {
    return studioPostJson_({
      ok: false,
      error: 'post_id and base64_data are required.'
    });
  }

  var folder = getOrCreateStudioGraphicsFolder_();
  var bytes = Utilities.base64Decode(base64Data);
  var blob = Utilities.newBlob(bytes, 'image/png', fileName);

  var existingFiles = folder.getFilesByName(fileName);
  while (existingFiles.hasNext()) {
    existingFiles.next().setTrashed(true);
  }

  var file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  var graphicUrl = 'https://drive.google.com/uc?export=view&id=' + file.getId();

  var sheet = getSheet_('SOCIAL_POSTS');
  var colMap = ensureColumns_(sheet, ['supporting_text', 'rejection_reason', 'updated_at']);
  var rowIdx = findRowIndexByValue_(sheet, colMap.post_id, postId);

  if (rowIdx === -1) {
    return studioPostJson_({
      ok: false,
      error: 'Post ID not found in SOCIAL_POSTS: ' + postId
    });
  }

  sheet.getRange(rowIdx, colMap.graphic_url + 1).setValue(graphicUrl);
  sheet.getRange(rowIdx, colMap.updated_at + 1).setValue(new Date());

  log_('INFO', 'GRAPHICS', 'Saved graphic for post ' + postId, graphicUrl);

  return studioPostJson_({
    ok: true,
    post_id: postId,
    graphic_url: graphicUrl,
    file_id: file.getId()
  });
}

/* =====================================================
   2. UPDATE / UPSERT SOCIAL POST (PHASE 4)
===================================================== */

function handleUpdatePost_(payload) {
  var postId = String(payload.post_id || '').trim();
  if (!postId) {
    return studioPostJson_({ ok: false, error: 'post_id is required.' });
  }

  var sheet = getSheet_('SOCIAL_POSTS');
  var colMap = ensureColumns_(sheet, ['supporting_text', 'rejection_reason', 'updated_at']);
  var rowIdx = findRowIndexByValue_(sheet, colMap.post_id, postId);

  if (rowIdx === -1) {
    return studioPostJson_({ ok: false, error: 'Post not found: ' + postId });
  }

  if (payload.headline !== undefined) {
    sheet.getRange(rowIdx, colMap.headline + 1).setValue(String(payload.headline).slice(0, 200));
  }
  if (payload.caption !== undefined) {
    sheet.getRange(rowIdx, colMap.caption + 1).setValue(String(payload.caption).slice(0, 2200));
  }
  if (payload.hashtags !== undefined) {
    sheet.getRange(rowIdx, colMap.hashtags + 1).setValue(String(payload.hashtags).slice(0, 500));
  }
  if (payload.supporting_text !== undefined) {
    sheet.getRange(rowIdx, colMap.supporting_text + 1).setValue(String(payload.supporting_text).slice(0, 1000));
  }
  if (payload.status !== undefined) {
    var nextStatus = String(payload.status).trim().toUpperCase();
    if (!ALLOWED_POST_STATUSES[nextStatus]) {
      return studioPostJson_({ ok: false, error: 'Invalid status for update_post: ' + nextStatus });
    }
    sheet.getRange(rowIdx, colMap.status + 1).setValue(nextStatus);
  }

  sheet.getRange(rowIdx, colMap.updated_at + 1).setValue(new Date());
  log_('INFO', 'POST_EDITOR', 'Updated social post ' + postId);

  return studioPostJson_({
    ok: true,
    post_id: postId
  });
}

function handleUpsertPostForArticle_(payload) {
  var articleId = String(payload.article_id || '').trim();
  var platform = String(payload.platform || '').trim().toUpperCase();

  if (!articleId || (platform !== 'INSTAGRAM' && platform !== 'TIKTOK')) {
    return studioPostJson_({
      ok: false,
      error: 'Valid article_id and platform (INSTAGRAM or TIKTOK) are required.'
    });
  }

  var sheet = getSheet_('SOCIAL_POSTS');
  var colMap = ensureColumns_(sheet, ['supporting_text', 'rejection_reason', 'updated_at']);
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();

  var existingRowIdx = -1;
  var existingPostId = '';

  if (lastRow >= 2) {
    var data = sheet.getRange(1, 1, lastRow, lastCol).getValues();
    for (var r = 1; r < data.length; r++) {
      var rowArticleId = String(data[r][colMap.article_id] || '').trim();
      var rowPlatform = String(data[r][colMap.platform] || '').trim().toUpperCase();
      if (rowArticleId === articleId && rowPlatform === platform) {
        existingRowIdx = r + 1;
        existingPostId = String(data[r][colMap.post_id] || '').trim();
        break;
      }
    }
  }

  var headline = String(payload.headline || '').slice(0, 200);
  var caption = String(payload.caption || '').slice(0, 2200);
  var hashtags = String(payload.hashtags || '').slice(0, 500);
  var supportingText = String(payload.supporting_text || '').slice(0, 1000);
  var status = String(payload.status || 'DRAFT').trim().toUpperCase();
  if (!ALLOWED_POST_STATUSES[status]) {
    status = 'DRAFT';
  }

  var now = new Date();

  if (existingRowIdx !== -1) {
    sheet.getRange(existingRowIdx, colMap.headline + 1).setValue(headline);
    sheet.getRange(existingRowIdx, colMap.caption + 1).setValue(caption);
    sheet.getRange(existingRowIdx, colMap.hashtags + 1).setValue(hashtags);
    sheet.getRange(existingRowIdx, colMap.supporting_text + 1).setValue(supportingText);
    sheet.getRange(existingRowIdx, colMap.status + 1).setValue(status);
    sheet.getRange(existingRowIdx, colMap.updated_at + 1).setValue(now);

    log_('INFO', 'POST_EDITOR', 'Updated ' + platform + ' draft for article ' + articleId);
    return studioPostJson_({ ok: true, post_id: existingPostId });
  }

  var newPostId = Utilities.getUuid();
  var newRow = new Array(Object.keys(colMap).length).fill('');
  newRow[colMap.post_id] = newPostId;
  newRow[colMap.article_id] = articleId;
  newRow[colMap.platform] = platform;
  newRow[colMap.caption] = caption;
  newRow[colMap.headline] = headline;
  newRow[colMap.hashtags] = hashtags;
  newRow[colMap.graphic_url] = '';
  newRow[colMap.status] = status;
  newRow[colMap.created_at] = now;
  newRow[colMap.supporting_text] = supportingText;
  newRow[colMap.rejection_reason] = '';
  newRow[colMap.updated_at] = now;

  sheet.appendRow(newRow);
  log_('INFO', 'POST_EDITOR', 'Created ' + platform + ' draft for article ' + articleId);

  return studioPostJson_({ ok: true, post_id: newPostId });
}

/* =====================================================
   3. APPROVAL WORKFLOW (PHASE 4)
===================================================== */

function handleSetPostStatus_(payload) {
  var postId = String(payload.post_id || '').trim();
  var nextStatus = String(payload.status || '').trim().toUpperCase();
  var rejectionReason = String(payload.rejection_reason || '').trim().slice(0, 500);

  if (!postId || !ALLOWED_POST_STATUSES[nextStatus]) {
    return studioPostJson_({
      ok: false,
      error: 'Valid post_id and status (DRAFT, NEEDS_REVIEW, APPROVED, REJECTED) are required.'
    });
  }

  if (nextStatus === 'REJECTED' && !rejectionReason) {
    return studioPostJson_({
      ok: false,
      error: 'A rejection_reason is required when rejecting a post.'
    });
  }

  var sheet = getSheet_('SOCIAL_POSTS');
  var colMap = ensureColumns_(sheet, ['supporting_text', 'rejection_reason', 'updated_at']);
  var rowIdx = findRowIndexByValue_(sheet, colMap.post_id, postId);

  if (rowIdx === -1) {
    return studioPostJson_({ ok: false, error: 'Post not found: ' + postId });
  }

  sheet.getRange(rowIdx, colMap.status + 1).setValue(nextStatus);
  sheet.getRange(rowIdx, colMap.rejection_reason + 1).setValue(
    nextStatus === 'REJECTED' ? rejectionReason : ''
  );
  sheet.getRange(rowIdx, colMap.updated_at + 1).setValue(new Date());

  log_(
    'INFO',
    'APPROVAL',
    'Post ' + postId + ' marked ' + nextStatus,
    nextStatus === 'REJECTED' ? rejectionReason : ''
  );

  return studioPostJson_({
    ok: true,
    post_id: postId,
    status: nextStatus
  });
}

/* =====================================================
   4. PUBLISHING QUEUE (PHASE 4 — NO LIVE PUBLISHING)
===================================================== */

function handleEnqueuePost_(payload) {
  var postId = String(payload.post_id || '').trim();
  var scheduledAt = String(payload.scheduled_at || '').trim();

  if (!postId || !scheduledAt) {
    return studioPostJson_({
      ok: false,
      error: 'post_id and scheduled_at are required.'
    });
  }

  var postsSheet = getSheet_('SOCIAL_POSTS');
  var postsCols = ensureColumns_(postsSheet, ['supporting_text', 'rejection_reason', 'updated_at']);
  var postRowIdx = findRowIndexByValue_(postsSheet, postsCols.post_id, postId);

  if (postRowIdx === -1) {
    return studioPostJson_({ ok: false, error: 'Post not found: ' + postId });
  }

  var currentStatus = String(
    postsSheet.getRange(postRowIdx, postsCols.status + 1).getValue() || ''
  ).trim().toUpperCase();

  if (currentStatus !== 'APPROVED') {
    return studioPostJson_({
      ok: false,
      error: 'Only APPROVED posts can be added to the publishing queue. Current status: ' + currentStatus
    });
  }

  var platform = String(
    postsSheet.getRange(postRowIdx, postsCols.platform + 1).getValue() || 'INSTAGRAM'
  ).trim().toUpperCase();

  var queueSheet = getSheet_('QUEUE');
  var queueCols = getColumnMap_(queueSheet);
  var existingQueueRowIdx = findRowIndexByValue_(queueSheet, queueCols.post_id, postId);
  var queueId = '';

  if (existingQueueRowIdx !== -1) {
    queueId = String(queueSheet.getRange(existingQueueRowIdx, queueCols.queue_id + 1).getValue());
    queueSheet.getRange(existingQueueRowIdx, queueCols.scheduled_at + 1).setValue(scheduledAt);
    queueSheet.getRange(existingQueueRowIdx, queueCols.status + 1).setValue('SCHEDULED');
  } else {
    queueId = Utilities.getUuid();
    queueSheet.appendRow([
      queueId,
      postId,
      platform,
      scheduledAt,
      'SCHEDULED',
      '',
      '',
      ''
    ]);
  }

  postsSheet.getRange(postRowIdx, postsCols.status + 1).setValue('SCHEDULED');
  postsSheet.getRange(postRowIdx, postsCols.updated_at + 1).setValue(new Date());

  log_('INFO', 'QUEUE', 'Queued post ' + postId + ' for ' + scheduledAt);

  return studioPostJson_({
    ok: true,
    queue_id: queueId,
    post_id: postId,
    status: 'SCHEDULED',
    scheduled_at: scheduledAt
  });
}

function handleUpdateQueueSchedule_(payload) {
  var queueId = String(payload.queue_id || '').trim();
  var scheduledAt = String(payload.scheduled_at || '').trim();

  if (!queueId || !scheduledAt) {
    return studioPostJson_({
      ok: false,
      error: 'queue_id and scheduled_at are required.'
    });
  }

  var queueSheet = getSheet_('QUEUE');
  var queueCols = getColumnMap_(queueSheet);
  var rowIdx = findRowIndexByValue_(queueSheet, queueCols.queue_id, queueId);

  if (rowIdx === -1) {
    return studioPostJson_({ ok: false, error: 'Queue item not found: ' + queueId });
  }

  queueSheet.getRange(rowIdx, queueCols.scheduled_at + 1).setValue(scheduledAt);
  log_('INFO', 'QUEUE', 'Rescheduled queue item ' + queueId + ' to ' + scheduledAt);

  return studioPostJson_({
    ok: true,
    queue_id: queueId,
    scheduled_at: scheduledAt
  });
}

function handleRecordPublishResult_(payload) {
  var postId = String(payload.post_id || '').trim();
  var queueId = String(payload.queue_id || '').trim();
  var jobId = String(payload.job_id || '').trim();
  var resultStatus = String(payload.status || '').trim().toUpperCase();
  var platformPostId = String(payload.platform_post_id || '').trim();
  var publishedAt = String(payload.published_at || '').trim();
  var errorMessage = String(payload.error_message || '').trim().slice(0, 500);

  if (!postId || (resultStatus !== 'PUBLISHED' && resultStatus !== 'FAILED')) {
    return studioPostJson_({
      ok: false,
      error: 'Valid post_id and status (PUBLISHED or FAILED) are required.'
    });
  }

  var queueSheet = getSheet_('QUEUE');
  var queueCols = ensureColumns_(queueSheet, ['job_id']);
  var queueRowIdx = queueId
    ? findRowIndexByValue_(queueSheet, queueCols.queue_id, queueId)
    : findRowIndexByValue_(queueSheet, queueCols.post_id, postId);

  if (queueRowIdx !== -1) {
    queueSheet.getRange(queueRowIdx, queueCols.status + 1).setValue(resultStatus);
    queueSheet.getRange(queueRowIdx, queueCols.job_id + 1).setValue(jobId);
    if (resultStatus === 'PUBLISHED') {
      queueSheet.getRange(queueRowIdx, queueCols.published_at + 1).setValue(publishedAt || new Date());
      queueSheet.getRange(queueRowIdx, queueCols.platform_post_id + 1).setValue(platformPostId);
      queueSheet.getRange(queueRowIdx, queueCols.error_message + 1).setValue('');
    } else {
      queueSheet.getRange(queueRowIdx, queueCols.error_message + 1).setValue(errorMessage);
    }
  }

  if (resultStatus === 'PUBLISHED') {
    var postsSheet = getSheet_('SOCIAL_POSTS');
    var postsCols = ensureColumns_(postsSheet, ['supporting_text', 'rejection_reason', 'updated_at']);
    var postRowIdx = findRowIndexByValue_(postsSheet, postsCols.post_id, postId);
    if (postRowIdx !== -1) {
      postsSheet.getRange(postRowIdx, postsCols.status + 1).setValue('PUBLISHED');
      postsSheet.getRange(postRowIdx, postsCols.updated_at + 1).setValue(new Date());
    }
  }

  log_(
    resultStatus === 'PUBLISHED' ? 'INFO' : 'ERROR',
    'PUBLISH',
    'Job ' + jobId + ' for post ' + postId + ' -> ' + resultStatus,
    resultStatus === 'PUBLISHED' ? platformPostId : errorMessage
  );

  return studioPostJson_({
    ok: true,
    post_id: postId,
    job_id: jobId,
    status: resultStatus
  });
}

/* =====================================================
   5. HELPERS
===================================================== */

function getColumnMap_(sheet) {
  var lastCol = sheet.getLastColumn();
  if (lastCol < 1) return {};
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var map = {};
  headers.forEach(function(h, idx) {
    var key = String(h || '').trim();
    if (key) map[key] = idx;
  });
  return map;
}

function ensureColumns_(sheet, requiredHeaders) {
  var map = getColumnMap_(sheet);
  var nextCol = sheet.getLastColumn() + 1;
  requiredHeaders.forEach(function(header) {
    if (map[header] === undefined) {
      sheet.getRange(1, nextCol).setValue(header);
      map[header] = nextCol - 1;
      nextCol++;
    }
  });
  return map;
}

function findRowIndexByValue_(sheet, colIndex, targetValue) {
  if (colIndex === undefined) return -1;
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return -1;
  var values = sheet.getRange(2, colIndex + 1, lastRow - 1, 1).getValues();
  for (var i = 0; i < values.length; i++) {
    if (String(values[i][0] || '').trim() === targetValue) {
      return i + 2;
    }
  }
  return -1;
}

function getOrCreateStudioGraphicsFolder_() {
  var configuredId = PropertiesService
    .getScriptProperties()
    .getProperty('STUDIO_DRIVE_FOLDER_ID');

  if (configuredId) {
    return DriveApp.getFolderById(configuredId);
  }

  var folderName = 'InsideTheIOM Studio Graphics';
  var folders = DriveApp.getFoldersByName(folderName);
  if (folders.hasNext()) {
    return folders.next();
  }
  return DriveApp.createFolder(folderName);
}

function authorizeStudioDrive() {
  getOrCreateStudioGraphicsFolder_();
}

function studioPostJson_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
