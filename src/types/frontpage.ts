export type FrontpageMenuItemChild = {
  id: string;
  label: string;
  url: string;
  path: string | null;
  icon: string;
};

export type FrontpageMenuItem = {
  id: string;
  label: string;
  url: string;
  path: string | null;
  icon: string;
  children: FrontpageMenuItemChild[];
};

export type FrontpageHero = {
  id: number;
  title: string | null;
  subtitle: string | null;
  cta_text: string | null;
  cta_link: string | null;
  cta_secondary_text: string | null;
  cta_secondary_link: string | null;
  image_url: string;
};

export type FrontpageService = {
  id: number;
  name: string;
  description: string | null;
  icon: string | null;
  icon_color: string | null;
};

export type FrontpageStat = {
  id: number;
  name: string;
  value: string;
};

export type FrontpageTestimonial = {
  id: number;
  author_name: string;
  content: string;
  stars: number;
  photo_url: string | null;
};

export type FrontpageFleet = {
  id: number;
  name: string;
  image_url: string;
};

export type FrontpageFaq = {
  question: string;
  answer: string;
};

export type FrontpageBlogPost = {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  published_at: string | null;
  image_url: string;
  url: string;
  path: string;
};

export type FrontpageCmsPage = {
  id: number;
  title: string;
  slug: string;
  highlight: string | null;
  body: string;
  meta_title: string | null;
  meta_description: string | null;
  image_url: string;
  path: string;
  url: string;
};

export type FrontpageContact = {
  label: string;
  value: string;
  href: string;
};

export type FrontpagePayload = {
  menu: FrontpageMenuItem[];
  heroes: FrontpageHero[];
  services: FrontpageService[];
  stats: FrontpageStat[];
  testimonials: FrontpageTestimonial[];
  fleets: FrontpageFleet[];
  steps: string[];
  faqs: FrontpageFaq[];
  blog_posts: FrontpageBlogPost[];
  cms_pages: FrontpageCmsPage[];
  contacts: FrontpageContact[];
  meta: {
    source: string;
    generated_at: string;
  };
};
