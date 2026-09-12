/** Shared demo data + types for the Research pages (list + detail). */

export type Category = 'daily' | 'commodity' | 'premium' | 'weekly' | 'calls';

export interface CategoryDef {
  key: Category | 'all';
  label: string;
  /** Emoji shown on the filter pill. */
  icon: string;
}

export interface ResearchReport {
  id: number;
  title: string;
  category: Category;
  day: number;
  month: string;
  postedBy: string;
  /** Background image URL for the card (from the report's ImageName), or null. */
  image: string | null;
}

export const CATEGORIES: CategoryDef[] = [
  { key: 'all', label: 'All', icon: '🗂️' },
  { key: 'daily', label: 'Daily Forex Reports', icon: '💱' },
  { key: 'commodity', label: 'Commodity Research', icon: '🛢️' },
  { key: 'premium', label: 'Premium Research', icon: '⭐' },
  { key: 'weekly', label: 'Weekly Research Report', icon: '📅' },
  { key: 'calls', label: 'Trading Calls', icon: '📈' },
];

export const CATEGORY_META: Record<Category, { label: string; icon: string }> = {
  daily: { label: 'Daily Forex Report', icon: '💱' },
  commodity: { label: 'Commodity Research', icon: '🛢️' },
  premium: { label: 'Premium Research', icon: '⭐' },
  weekly: { label: 'Weekly Research', icon: '📅' },
  calls: { label: 'Trading Call', icon: '📈' },
};

/** Report_Template_Details.ResearchType code → gallery category. */
export const CODE_TO_CATEGORY: Record<string, Category> = {
  D: 'daily',
  C: 'commodity',
  P: 'premium',
  W: 'weekly',
  T: 'calls',
};

/** Raw published-report row from the public Research API. */
export interface ResearchReportDto {
  templateId: number;
  title: string | null;
  researchType: string | null; // D/C/P/W/T
  researchTypeText: string | null;
  imageName: string | null;
  postedBy: string | null;
  createdDatetime: string | null;
}

/** A single report plus its HTML body for the detail page. */
export interface ResearchReportDetailDto extends ResearchReportDto {
  content: string;
}

/** The rendered report detail (mapped for the detail page). */
export interface ResearchReportDetail extends ResearchReport {
  content: string;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Folder (served from FrontEnd/public) holding the research illustration images.
 * A report's ImageName (a dropdown value, e.g. "gold") maps to "<name>.jpg.png".
 */
const IMAGE_DIR = '/research-images';
const IMAGE_EXT = '.jpg.png';

/**
 * The illustration files actually present in /public/research-images (18 dropdown
 * names exist but "commodityquotes" has no file). Matching against this set means an
 * unknown/missing ImageName resolves to null — the card keeps its gradient background
 * and no doomed 404 request is fired. Lookup is case-insensitive to tolerate any
 * casing drift between the stored ImageName and the file, resolving to the real name.
 */
const IMAGE_FILES = [
  '1dicecoin', '2dicecoins', 'Buy-Sell-balance', 'Currencyexchange', 'Currencyglobesymbol',
  'Currencysymbol', 'coingrowth', 'coins', 'commodityzigzag', 'fxchart', 'fxsymbols',
  'fxtrading', 'gold', 'growthbar', 'ladywithfinger', 'onlycoins', 'pencopynotes',
];
const IMAGE_BY_LOWER = new Map(IMAGE_FILES.map((n) => [n.toLowerCase(), n]));

/** Resolves a stored ImageName to its background image URL, or null when there's no such file. */
export function researchImageUrl(imageName: string | null | undefined): string | null {
  const file = IMAGE_BY_LOWER.get((imageName ?? '').trim().toLowerCase());
  return file ? `${IMAGE_DIR}/${file}${IMAGE_EXT}` : null;
}

/** Maps an API row to the card/detail shape used by the templates. */
export function mapReport(dto: ResearchReportDto): ResearchReport {
  const d = dto.createdDatetime ? new Date(dto.createdDatetime) : null;
  const valid = d && !isNaN(d.getTime());
  return {
    id: dto.templateId,
    title: dto.title ?? 'Untitled report',
    category: CODE_TO_CATEGORY[dto.researchType ?? ''] ?? 'daily',
    day: valid ? d!.getDate() : 0,
    month: valid ? MONTHS[d!.getMonth()] : '',
    // Always attributed to the team on the public site, regardless of the author.
    postedBy: 'Team RouteForex',
    image: researchImageUrl(dto.imageName),
  };
}
