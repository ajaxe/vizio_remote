# Remote control Vizio TV

## Goal

* Create remote control for Vizio TV.
* Create offline javascript app.

## Requirements

* Use npm library **vizio-smart-cast** for remote control operations
* Use **pnpm** for node package managmeent.
* **Supported operations:**
  * **Navigation controls:** directional navigation keys with up, right, down and left arrows.
  * **select operation:** "OK" button in the center of _navigational_ keys to select the highlighted option on the TV.
  * **mute button:** mute button to turn off sound on the TV
  * **volume control:** Volume control key "+" (plus) key to increase volume while "-" (minus) key to reduce the volume.
  * **back button:** back button operations to take the user to previous screen.
  * **home button:** home button when clicked takes the user to home screen on the TV.
* **vizio tv app:** a row of vizio applications which is side scrollable when the list of app exceed the width.
* **responsive design:** the remote control must be responsive and intended for small screen width.
* **initial pairing:** whenever auth token is not available the user should be able to initiate pairing sequence. The auth token will be stored in localstorage for the domain.
