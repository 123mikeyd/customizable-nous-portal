// Customizable Nous Portal — built-in art catalog (shared by popup + content script).
// girl: true = Nous Girl art (hidden by the "No Nous Girl" switch).
// focus: object-position so narrow/mobile plates crop around the subject.
globalThis.NCP_ART = [
  { id: "watercolor",      label: "Watercolor",      girl: true,  focus: "73% 50%" },
  { id: "etching",         label: "Etching",         girl: true,  focus: "62% 50%" },
  { id: "terminal",        label: "Terminal",        girl: true,  focus: "70% 50%" },
  { id: "hermes-bust",     label: "Hermes",          girl: false, focus: "center" },
  { id: "doorway",         label: "Doorway",         girl: false, focus: "center" },
  { id: "mission-control", label: "Mission Control", girl: false, focus: "center" },
  { id: "marble",          label: "Marble",          girl: false, focus: "center" },
  { id: "glitch-portrait", label: "Glitch Portrait", girl: false, focus: "center" },
  { id: "nutrition-label", label: "Nutrition Label", girl: false, focus: "center" },
];
globalThis.NCP_DEFAULTS = {
  mode: "watercolor",     // an art id, or custom | random | original | hidden
  custom: null,           // data URL of the user's 3:1 banner
  customPos: "center",
  noGirl: false,          // hide Nous Girl art everywhere
  randomExclude: [],      // ids (incl. "custom") left out of Random
};
