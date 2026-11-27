/**
 * INSIDETHEIOM STUDIO — PHASE 2 READ-ONLY API EXTENSION
 *
 * Add this as a separate file (e.g. StudioApi.gs) in your existing
 * Google Apps Script project alongside Code.gs.
 *
 * - Preserves all existing functions in Code.gs
 * - Uses existing CONFIG, getSheet_(), and getSettings_() from Code.gs
 * - Validates shared secret stored in Script Properties: STUDIO_API_SECRET
 * - Read-only endpoints for Phase 2
 */

/**
 * Web App GET entrypoint for InsideTheIOM Studio (read-only).
 *
 * Expected query parameters:
 * - secret: must match Script Property STUDIO_API_SECRET
 * - action: all | health | news | social_posts | sources | media | queue | settings | logs
 */
function doGet(e) {
  try {
    const params = (e && e.parameter) ? e.parameter : {};
    const providedSecret = String(params.secret || '');
    const expectedSecret = PropertiesService
      .getScriptProperties()
      .getProperty('STUDIO_API_SECRET');

    if (!expectedSecret) {
      return studioJsonResponse_({
        ok: false,
        error: 'STUDIO_API_SECRET is not configured in Script Properties.'
      });
    }

    if (!providedSecret || providedSecret !== expectedSecret) {
      return studioJsonResponse_({
        ok: false,
        error: 'Unauthorized request.'
      });
    }

    const action = String(params.action || 'health').toLowerCase().trim();

    switch (action) {
      case 'health':
        return studioJsonResponse_({
          ok: true,
          service: 'InsideTheIOM Studio API',
          mode: 'read-only',
          timezone: CONFIG.timezone,
          timestamp: new Date().toISOString()
        });

      case 'news':
        return studioJsonResponse_({
          ok: true,
          data: readSheetRecords_('NEWS')
        });

      case 'social_posts':
        return studioJsonResponse_({
          ok: true,
          data: readSheetRecords_('SOCIAL_POSTS')
        });

      case 'sources':
        return studioJsonResponse_({
          ok: true,
          data: readSheetRecords_('SOURCES')
        });

      case 'media':
        return studioJsonResponse_({
          ok: true,
          data: readSheetRecords_('MEDIA')
        });

      case 'queue':
        return studioJsonResponse_({
          ok: true,
          data: readSheetRecords_('QUEUE')
        });

      case 'settings':
        return studioJsonResponse_({
          ok: true,
          data: readSheetRecords_('SETTINGS')
        });

      case 'logs':
        return studioJsonResponse_({
          ok: true,
          data: readSheetRecords_('LOGS')
        });

      case 'all':
        return studioJsonResponse_({
          ok: true,
          timestamp: new Date().toISOString(),
          data: {
            sources: readSheetRecords_('SOURCES'),
            news: readSheetRecords_('NEWS'),
            social_posts: readSheetRecords_('SOCIAL_POSTS'),
            media: readSheetRecords_('MEDIA'),
            queue: readSheetRecords_('QUEUE'),
            settings: readSheetRecords_('SETTINGS'),
            logs: readSheetRecords_('LOGS')
          }
        });

      default:
        return studioJsonResponse_({
          ok: false,
          error: 'Unsupported action: ' + action
        });
    }
  } catch (error) {
    return studioJsonResponse_({
      ok: false,
      error: error && error.message ? error.message : 'Internal Apps Script error.'
    });
  }
}

/**
 * Reads all rows from a configured tab using row 1 headers as object keys.
 */
function readSheetRecords_(tabKey) {
  const sheet = getSheet_(tabKey);
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();

  if (lastRow < 2 || lastCol < 1) {
    return [];
  }

  const values = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  const headers = values[0].map(function(header) {
    return String(header || '').trim();
  });

  const records = [];

  for (var r = 1; r < values.length; r++) {
    var row = values[r];
    var isEmptyRow = row.every(function(cell) {
      return cell === '' || cell === null || cell === undefined;
    });

    if (isEmptyRow) {
      continue;
    }

    var record = {};
    for (var c = 0; c < headers.length; c++) {
      var key = headers[c];
      if (!key) continue;

      var val = row[c];
      if (val instanceof Date) {
        record[key] = val.toISOString();
      } else {
        record[key] = val;
      }
    }
    records.push(record);
  }

  return records;
}

/**
 * Returns a JSON ContentService response.
 */
function studioJsonResponse_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
