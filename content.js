function cleanText(value) {
  return (value || '').replace(/\s+/g, ' ').trim();
}

function uniqueValues(values) {
  return [...new Set(values.filter(Boolean))];
}

function isLikelyProfileTitle(value) {
  if (!value) return false;
  const text = cleanText(value);
  if (text.length < 2 || text.length > 150) return false;
  if (/^(?:he\/him|she\/her|they\/them|he\/they|she\/they|they\/he|they\/she|il\/lui|elle\/elle|iel\/iel)$/i.test(text)) {
    return false;
  }
  if (/^[·•]\s*\d+\s*(?:er|e|ème|th|nd|rd)?$/i.test(text)) return false;
  if (/^infos$|^coordonnées$|^contact$|^profil$|^profile$|^vérification en \d+\s*minutes?$|passer à la recherche|looking for opportunities|looking for work|linkedin|expérience|experience|à propos|about|formations|education|compétences|skills|certifications|réalisations|projects|l'essentiel|l’essentiel|activities|posts|articles|résultats|recherche|search/i.test(text)) {
    return false;
  }
  return !/^(?:voir|plus d'info|plus d’information|détails|éducation|formations|expérience|compétences|coordonnées)$/i.test(text);
}

function getProfileName() {
  const nameNode = document.querySelector('div[id*="profile.card."][id*="Topcard"] h2');
  const name = cleanText(nameNode?.textContent || '');

  if (!name || /^(?:infos|coordonnées|contact|profil|profile|l'essentiel|l’essentiel|expérience|experience|à propos|about|compétences|skills)$/i.test(name)) {
    return '';
  }

  return name;
}

function getCurrentTitle() {
  const profileCard = document.querySelector('div[id*="profile.card."][id*="Topcard"]');
  const titleNode = Array.from(profileCard?.querySelectorAll('p') || [])
    .find((node) => isLikelyProfileTitle(node.textContent || ''));

  return cleanText(titleNode?.textContent || '');
}

function normalizeSkillText(value) {
  return cleanText(value)
    .replace(/et\s*\d+\s*compétences?\s*de\s*plus/i, '')
    .replace(/et\s*\d+\s*skills?\s*de\s*plus/i, '')
    .replace(/\s*[|–-]\s*.*$/, '')
    .replace(/^infos$/i, '')
    .replace(/^coordonnées$/i, '')
    .trim();
}

function getSkills() {
  const seen = new Set();
  const skills = [];

  const skillLinks = Array.from(document.querySelectorAll('a[href*="/overlay/"]'));
  for (const link of skillLinks) {
    const raw = cleanText(link.textContent || '');
    if (!raw) continue;

    const parts = raw
      .split(',')
      .map((item) => normalizeSkillText(item))
      .filter((item) => item && item.length > 2 && !/compétence|skills|plus|linkedin|infos|coordonnées|contact|profil|profile/i.test(item));

    for (const item of parts) {
      if (!seen.has(item)) {
        seen.add(item);
        skills.push(item);
      }
    }
  }

  if (skills.length) return uniqueValues(skills).slice(0, 20);

  const bodyText = cleanText(document.body.textContent || '');
  const tokens = [...bodyText.matchAll(/[A-Za-zÀ-ÖØ-öø-ÿ-]{3,40}/g)];
  for (const match of tokens) {
    const token = cleanText(match[0]);
    const lower = token.toLowerCase();
    if (!token || token.length > 40) continue;
    if (/ux|ui|figma|design|product|web|conversion|retention|saas|startup|marketing|research|growth|strategy|prototype/i.test(lower)) {
      if (!seen.has(token)) {
        seen.add(token);
        skills.push(token);
      }
    }
  }

  return uniqueValues(skills).slice(0, 20);
}

function extractYearsFromDuration(value) {
  const text = cleanText(value)
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .toLowerCase();

  if (!text) return 0;

  const yearsMonths = text.match(/(\d{1,2})\s*(?:ans?|years?)\s*(\d{1,2})\s*(?:mois?|months?)/i);
  if (yearsMonths) {
    return Number(yearsMonths[1]) + Number(yearsMonths[2]) / 12;
  }

  const yearsOnly = text.match(/(\d{1,2})\s*(?:ans?|years?)/i);
  if (yearsOnly) {
    return Number(yearsOnly[1]);
  }

  const monthsOnly = text.match(/(\d{1,2})\s*(?:mois?|months?)/i);
  if (monthsOnly) {
    return Number(monthsOnly[1]) / 12;
  }

  return 0;
}

function estimateYearsOfExperience() {
  const experienceSection = document.querySelector('div[data-testid^="profile_ExperienceTopLevelSection_"]');
  const candidates = [];

  const nodes = experienceSection ? experienceSection.querySelectorAll('p') : document.querySelectorAll('p');

  for (const node of nodes) {
    const text = cleanText(node.textContent || '');
    if (!text) continue;
    if (!/\d{4}/.test(text) && !/ans|an|mois|month|year|years/i.test(text)) continue;
    const years = extractYearsFromDuration(text);
    if (years > 0) {
      candidates.push(years);
    }
  }

  if (candidates.length) {
    return Math.round(candidates.reduce((sum, value) => sum + value, 0) / candidates.length);
  }

  return 0;
}

function splitFullName(fullName) {
  const parts = cleanText(fullName).split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || '',
    lastName: parts.slice(1).join(' ') || ''
  };
}

function extractLinkedInProfile() {
  const fullName = getProfileName();
  const { firstName, lastName } = splitFullName(fullName);

  return {
    firstName,
    lastName,
    fullName,
    jobTitle: getCurrentTitle(),
    skills: getSkills(),
    yearsOfExperience: estimateYearsOfExperience(),
    sourceUrl: window.location.href
  };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'extractProfile') {
    try {
      sendResponse({ success: true, data: extractLinkedInProfile() });
    } catch (error) {
      sendResponse({ success: false, error: String(error) });
    }
    return true;
  }
  return false;
});