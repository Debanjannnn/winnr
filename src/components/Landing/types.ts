export interface Partner {
  name: string;
  logo?: string;
}

export interface Stat {
  value: string;
  label: string;
}

export interface Feature {
  index: string;
  title: string;
  text: string;
}

export interface UseCase {
  title: string;
  description: string;
}

export interface NavLink {
  href: string;
  label: string;
}
