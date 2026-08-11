/** A module row in the permission tree (RF_Module). */
export interface PermModule {
  moduleId: number;
  moduleName: string;
  sortOrder: number;
}

/** A screen row in the permission tree (RF_ModuleScreen), tagged with its module. */
export interface PermScreen {
  screenId: number;
  moduleId: number;
  screenName: string;
  route: string | null;
  sortOrder: number;
}

/** All active modules + screens for building the grid. */
export interface RolePermissionTree {
  modules: PermModule[];
  screens: PermScreen[];
}

/** Save payload — the full set of screen ids granted to a role. */
export interface SaveRolePermission {
  roleId: number;
  screenIds: number[];
}
