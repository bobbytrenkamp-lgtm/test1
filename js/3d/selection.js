/* js/3d/selection.js
 * 3D object selection state — mirrors js/parcel/selection.js's shape
 * (single selection + CustomEvent notifications) for the same object-list/
 * transform-gizmo integration pattern already used elsewhere in the app.
 *
 * Events emitted on document:
 *   scene3d:object-selected   — { id }
 *   scene3d:object-deselected — {}
 */
window.SCENE3D_SELECTION = (function () {
  'use strict';

  let _selectedId = null;

  function _emit(type, detail) {
    if (typeof document !== 'undefined' && document.dispatchEvent) {
      document.dispatchEvent(new CustomEvent(type, { detail, bubbles: false }));
    }
  }

  function select(id) {
    if (!id) { deselect(); return; }
    _selectedId = id;
    _emit('scene3d:object-selected', { id });
  }

  function deselect() {
    if (_selectedId === null) return;
    _selectedId = null;
    _emit('scene3d:object-deselected', {});
  }

  function getSelected() {
    return _selectedId;
  }

  function isSelected(id) {
    return _selectedId !== null && _selectedId === id;
  }

  return { select, deselect, getSelected, isSelected };
})();
