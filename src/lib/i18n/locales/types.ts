export type LocaleBundle = {
  [namespace: string]: {
    [key: string]: string | Record<string, string>;
  };
};

export type LocaleCatalog = Record<string, LocaleBundle>;
