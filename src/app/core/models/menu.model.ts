/** A screen the user can navigate to, with its status badge. */
export interface MenuScreen {
  screenId: number;
  screenName: string;
  route: string;
  icon?: string | null;
  /** Available | Soon | New | Pay */
  screenStatus: string;
  /** False = visible in the menu but blocked from opening (access denied). */
  canAccess: boolean;
}

/** A navigation group with the screens the user is permitted to see. */
export interface MenuModule {
  moduleId: number;
  moduleName: string;
  icon?: string | null;
  screens: MenuScreen[];
}
