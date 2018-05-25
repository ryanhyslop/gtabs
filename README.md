#GTabber

A tabbing component for sections of latest news from the Guardian API.

### To view

### Considerations

- Inital 'no javascript' state.
- Cross browser support, should work down to IE8.
- Source code in typescript for strict type checking, but compiling down to ES3 compatible code.
- No module loader.
- Avoid using css classnames for looking up elements for toggling, try and pass references to elements.
- Accessibility & Keyboard access, focusing content when moving between tabs.
- Render content as soon as its available.
- Avoid polyfills as much as possible to keep it lightweight.

### Areas to improve

- CSS, could have more sophisticated layout styles (flexbox with fallbacks), transitions.
- Accessibility is sort of bare minimium and following recommendations rather than tested.
- Could be expanded to take the sections as config to the constructor very easily.
- Load more / pagination?
- Ended up with a polyfil for Array forEach and reduce which I felt was relatively reasonable.