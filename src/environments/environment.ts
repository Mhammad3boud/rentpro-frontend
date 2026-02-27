// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:8083',
  appVersion: '1.0.0',
  enforceVersionGateOnWeb: false,
  updateUrls: {
    android: 'https://play.google.com/store/apps/details?id=com.rentpro.app',
    ios: 'https://apps.apple.com',
    web: 'https://your-domain.example.com/download'
  }
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
