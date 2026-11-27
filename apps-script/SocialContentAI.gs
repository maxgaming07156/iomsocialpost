/**
 * INSIDETHEIOM STUDIO — IMPROVED AI SOCIAL CONTENT GENERATION
 *
 * Replace Sections 4, 5, 8, and 9 in your existing Code.gs with this module
 * (or add it and remove the duplicate functions from Code.gs).
 *
 * IMPROVEMENTS:
 * - Professional local journalism tone (no AI clichés, no clickbait, no emojis)
 * - ZERO external publisher names (BBC, Manx Radio, Gef, IOM Today, 3FM, Energy FM)
 * - ZERO external RSS source URLs or tracking parameters in public content
 * - Every read-more CTA directs to https://insidetheiom.com
 * - Natural Isle of Man SEO keywords
 * - Distinct Instagram (editorial) and TikTok (punchy/conversational) captions
 * - Dedicated short graphic_headline and graphic_description (stored in supporting_text)
 * - 8–12 deduplicated, story-relevant hashtags
 * - Pre-save quality-check sanitizer
 */

function processSocialNews() {
  const lock = LockService.getScriptLock();

  if (!lock.tryLock(10000)) {
    log_('WARNING', 'AI', 'Another AI processing run is active.');
    return;
  }

  try {
    const newsSheet = getSheet_('NEWS');
    const postsSheet = getSheet_('SOCIAL_POSTS');

    if (newsSheet.getLastRow() < 2) {
      log_('INFO', 'AI', 'No news stories available.');
      return;
    }

    const postCols = ensurePostColumns_(postsSheet, [
      'supporting_text',
      'rejection_reason',
      'updated_at'
    ]);

    const data = newsSheet.getDataRange().getValues();
    const headers = data[0].map(String);
    const col = {};
    headers.forEach(function(header, index) {
      col[header] = index;
    });

    const required = [
      'article_id',
      'source_name',
      'source_url',
      'original_title',
      'description',
      'image_url',
      'status',
      'relevance_score',
      'processed_at'
    ];

    required.forEach(function(name) {
      if (col[name] === undefined) {
        throw new Error('Missing NEWS column: ' + name);
      }
    });

    let processed = 0;

    for (let i = 1; i < data.length; i++) {
      if (processed >= AI_CONFIG.batchSize) {
        break;
      }

      const row = data[i];
      const status = String(row[col.status] || '').toUpperCase();

      if (status !== 'NEW') {
        continue;
      }

      const story = {
        id: row[col.article_id],
        source: row[col.source_name],
        url: row[col.source_url],
        title: row[col.original_title],
        description: row[col.description],
        imageUrl: row[col.image_url]
      };

      try {
        newsSheet.getRange(i + 1, col.status + 1).setValue('PROCESSING');

        const result = generateSocialContent_(story);
        const score = Math.max(0, Math.min(100, Number(result.relevance_score) || 0));

        newsSheet.getRange(i + 1, col.relevance_score + 1).setValue(score);
        newsSheet.getRange(i + 1, col.processed_at + 1).setValue(new Date());

        if (result.decision !== 'APPROVE' || score < AI_CONFIG.minimumRelevance) {
          newsSheet.getRange(i + 1, col.status + 1).setValue('REJECTED');
          log_(
            'INFO',
            'AI',
            'Rejected: ' + story.title + ' | Score: ' + score + ' | ' + result.reason
          );
          processed++;
          continue;
        }

        const now = new Date();
        const hashtags = result.hashtags.join(' ');
        const drafts = [
          { platform: 'INSTAGRAM', caption: result.instagram_caption },
          { platform: 'TIKTOK', caption: result.tiktok_caption }
        ];

        drafts.forEach(function(draft) {
          const newRow = new Array(Object.keys(postCols).length).fill('');
          newRow[postCols.post_id] = Utilities.getUuid();
          newRow[postCols.article_id] = story.id;
          newRow[postCols.platform] = draft.platform;
          newRow[postCols.caption] = draft.caption;
          newRow[postCols.headline] = result.social_headline;
          newRow[postCols.hashtags] = hashtags;
          newRow[postCols.graphic_url] = '';
          newRow[postCols.status] = 'DRAFT';
          newRow[postCols.created_at] = now;
          newRow[postCols.supporting_text] = result.graphic_description;
          newRow[postCols.rejection_reason] = '';
          newRow[postCols.updated_at] = now;
          postsSheet.appendRow(newRow);
        });

        newsSheet.getRange(i + 1, col.status + 1).setValue('AI_APPROVED');
        log_('INFO', 'AI', 'Created social drafts: ' + story.title + ' | Score: ' + score);
      } catch (error) {
        newsSheet.getRange(i + 1, col.status + 1).setValue('AI_ERROR');
        newsSheet.getRange(i + 1, col.processed_at + 1).setValue(new Date());
        log_('ERROR', 'AI', 'Could not process: ' + story.title, error.message);
      }

      processed++;
    }

    log_('INFO', 'AI', 'AI run completed. Stories attempted: ' + processed);
  } finally {
    lock.releaseLock();
  }
}

function ensurePostColumns_(sheet, requiredHeaders) {
  const lastCol = sheet.getLastColumn();
  const headers = lastCol > 0
    ? sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function(h) { return String(h || '').trim(); })
    : [];
  const map = {};
  headers.forEach(function(h, idx) {
    if (h) map[h] = idx;
  });
  let nextCol = lastCol + 1;
  requiredHeaders.forEach(function(header) {
    if (map[header] === undefined) {
      sheet.getRange(1, nextCol).setValue(header);
      map[header] = nextCol - 1;
      nextCol++;
    }
  });
  return map;
}

/* =====================================================
   IMPROVED SOCIAL CONTENT PROMPT
===================================================== */

function generateSocialContent_(story) {
  const prompt = `
You are the senior editorial journalist and social editor for InsideTheIOM.
InsideTheIOM (insidetheiom.com) is an independent Isle of Man news and local information publisher.

INTERNAL STORY INPUT (FOR FACTUAL REFERENCE ONLY — DO NOT CITE THE PUBLISHER OR URL):
ORIGINAL HEADLINE: ${story.title}
STORY DETAILS: ${story.description}

STRICT EDITORIAL & BRANDING RULES:
1. Prioritise stories relevant to Isle of Man residents, businesses, and visitors.
2. NEVER mention any external news publisher or source name (never write BBC, BBC Isle of Man, Manx Radio, Gef, IOM Today, Isle of Man Today, 3FM, Energy FM, or gov.im).
3. NEVER write phrases like "According to...", "As reported by...", or "Source:".
4. NEVER include any external URL or tracking parameter. Every read-more CTA MUST direct readers to https://insidetheiom.com (e.g., "Read more at insidetheiom.com").
5. Do NOT invent facts, dates, quotes, figures, or details beyond the supplied headline and description.
6. Write in crisp, natural British English like a trusted local newsroom — avoid generic AI openings ("In a recent development", "Exciting news!"), clickbait, exclamation marks, and unnecessary emojis.
7. Naturally weave in relevant Isle of Man SEO search phrases (e.g., "Isle of Man news", "Isle of Man history", "Manx heritage", "Douglas", "Peel", etc. where genuinely relevant — no keyword stuffing).

PLATFORM REQUIREMENTS:
- social_headline: Crisp 5–9 word graphic headline for a 1080x1350 news card. No URLs, no hashtags, no publisher names.
- graphic_description: Concise 1–2 sentence summary (max 160 characters) for the graphic card. Must NOT be a copy of the full social caption. No URLs, no hashtags.
- instagram_caption: Informative, editorial tone in 2–3 short natural paragraphs. Strong SEO-friendly opening, clear context, engagement prompt, and end with "Read more at insidetheiom.com".
- tiktok_caption: Distinct from Instagram — shorter, punchier curiosity hook in conversational tone, 1–2 tight sentences, and end with "Full story at insidetheiom.com".
- hashtags: 8 to 12 relevant hashtags mixing Isle of Man community tags (#IsleOfMan, #InsideTheIOM, #ManxNews), location tags (e.g. #Douglas, #Peel, #Ramsey if relevant), and story-specific subject tags. No duplicates.

RELEVANCE SCORING:
0-30: Irrelevant | 31-50: Low | 51-69: Moderate | 70-84: Relevant | 85-94: Highly relevant | 95-100: Major Isle of Man news.

RETURN ONLY VALID JSON:
{
  "decision": "APPROVE or REJECT",
  "relevance_score": 0,
  "reason": "Short editorial explanation",
  "social_headline": "Short graphic headline",
  "graphic_description": "Concise 1-2 sentence graphic summary",
  "instagram_caption": "Editorial Instagram caption ending with insidetheiom.com",
  "tiktok_caption": "Punchy, distinct TikTok caption ending with insidetheiom.com",
  "hashtags": ["#IsleOfMan", "#InsideTheIOM", "#ManxNews"]
}
`;

  let result;

  try {
    result = callGeminiSocial_(prompt);
    log_('INFO', 'AI_PROVIDER', 'Gemini generated social content.');
  } catch (geminiError) {
    log_('WARNING', 'AI_PROVIDER', 'Gemini failed. Trying Groq.', geminiError.message);
    result = callGroqSocial_(prompt);
    log_('INFO', 'AI_PROVIDER', 'Groq generated social content.');
  }

  return validateSocialResult_(result);
}

/* =====================================================
   QUALITY CHECKS & SANITIZER
===================================================== */

function sanitizePublicCopy_(text, includeCta) {
  let cleaned = String(text || '').trim();
  if (!cleaned) return '';

  cleaned = cleaned
    .replace(/read\s+more\s*:?\s*https?:\/\/(?!insidetheiom\.com\b)[^\s)]+/gi, '')
    .replace(/https?:\/\/(?!insidetheiom\.com\b)[^\s)]+/gi, '')
    .replace(/\b(?:according to|as reported by|reported by|via|courtesy of|source:)\s+(?:bbc(?:\s+isle\s+of\s+man)?|manx\s+radio|isle\s+of\s+man\s+today|iom\s+today|3fm|energy\s+fm|gef(?:\s+the\s+mongoose)?|isle\s+of\s+man\s+government|gov\.im)\b[:,]?\s*/gi, '')
    .replace(/\b(?:bbc\s+isle\s+of\s+man|bbc\s+news|bbc|manx\s+radio|isle\s+of\s+man\s+today|iom\s+today|3fm|energy\s+fm|gef\s+the\s+mongoose)\b/gi, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/read\s+more\s*:\s*$/gim, '')
    .trim();

  if (includeCta && !/insidetheiom\.com/i.test(cleaned)) {
    cleaned += '\n\nRead more at https://insidetheiom.com';
  }

  return cleaned;
}

function normalizeHashtags_(rawTags) {
  const defaults = [
    '#IsleOfMan',
    '#InsideTheIOM',
    '#ManxNews',
    '#IsleOfManNews',
    '#ManxLife',
    '#IOM',
    '#ManxCommunity',
    '#DiscoverIOM'
  ];

  const seen = {};
  const out = [];

  (Array.isArray(rawTags) ? rawTags : []).forEach(function(tag) {
    const t = String(tag || '').trim();
    if (!t) return;
    const formatted = t.charAt(0) === '#' ? t : '#' + t;
    const key = formatted.toLowerCase();
    if (!seen[key] && out.length < 12) {
      seen[key] = true;
      out.push(formatted);
    }
  });

  defaults.forEach(function(defTag) {
    if (out.length >= 8) return;
    const key = defTag.toLowerCase();
    if (!seen[key]) {
      seen[key] = true;
      out.push(defTag);
    }
  });

  return out.slice(0, 12);
}

function validateSocialResult_(result) {
  const decision = String(result.decision || '').toUpperCase();
  if (!['APPROVE', 'REJECT'].includes(decision)) {
    throw new Error('Invalid AI decision.');
  }

  const score = Number(result.relevance_score);
  if (!Number.isFinite(score) || score < 0 || score > 100) {
    throw new Error('Invalid relevance score.');
  }

  if (!result.reason) {
    throw new Error('AI did not provide a decision reason.');
  }

  if (decision === 'APPROVE') {
    if (!result.social_headline || !result.instagram_caption || !result.tiktok_caption) {
      throw new Error('AI social content is incomplete.');
    }
  }

  const cleanHeadline = sanitizePublicCopy_(result.social_headline || '', false)
    .replace(/#\w+/g, '')
    .slice(0, 120);

  const cleanGraphicDesc = sanitizePublicCopy_(
    result.graphic_description || '',
    false
  )
    .replace(/#\w+/g, '')
    .slice(0, 220);

  const cleanIg = sanitizePublicCopy_(result.instagram_caption || '', true).slice(0, 2200);
  const cleanTt = sanitizePublicCopy_(result.tiktok_caption || '', true).slice(0, 2200);

  return {
    decision: decision,
    relevance_score: score,
    reason: String(result.reason).slice(0, 500),
    social_headline: cleanHeadline,
    graphic_description: cleanGraphicDesc,
    instagram_caption: cleanIg,
    tiktok_caption: cleanTt,
    hashtags: normalizeHashtags_(result.hashtags)
  };
}

/* =====================================================
   TEST 5 DIVERSE STORIES WITHOUT MODIFYING SHEETS
===================================================== */

function testSocialAIBatch() {
  const samples = [
    {
      source: 'BBC Isle of Man',
      title: 'Metal detectorists uncover ancient silver coins on Isle of Man',
      description: 'Two local metal detectorists have discovered a hoard of medieval silver coins, declared treasure at a Douglas inquest and set to go on display at the Manx Museum.',
      url: 'https://www.bbc.co.uk/news/articles/example-treasure'
    },
    {
      source: 'Manx Radio',
      title: 'Steam Packet confirms winter timetable adjustments for Douglas-Heysham sailings',
      description: 'The Isle of Man Steam Packet Company has published updated winter departure windows between Douglas and Heysham to improve reliability during Irish Sea swells.',
      url: 'https://www.manxradio.com/news/example-ferry'
    },
    {
      source: 'Isle of Man Government',
      title: 'Public consultation opens on coastal flood resilience in Ramsey and Peel',
      description: 'Residents in Ramsey, Peel, and Castletown can submit feedback on proposed sea-wall upgrades and harbour drainage improvements before January.',
      url: 'https://www.gov.im/news/example-coastal'
    },
    {
      source: 'Isle of Man Today',
      title: 'Peel harbour Christmas markets confirm 45 local artisan and food stalls',
      description: 'Independent Manx bakers, ceramicists, and food producers will gather along Peel breakwater for the annual festive weekend market.',
      url: 'https://www.iomtoday.co.im/news/example-peel'
    },
    {
      source: '3FM',
      title: 'TT 2027 grandstand and paddock hospitality allocation opens',
      description: 'Organisers have released the first wave of grandstand passes and VIP hospitality packages for next summer Isle of Man TT Races.',
      url: 'https://www.three.fm/news/example-tt'
    }
  ];

  samples.forEach(function(sample, idx) {
    const out = generateSocialContent_(sample);
    Logger.log('=== STORY ' + (idx + 1) + ' ===');
    Logger.log(JSON.stringify(out, null, 2));
  });
}
