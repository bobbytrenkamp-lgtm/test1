/* js/parcel/selection.js
 * Parcel selection manager — single select, multi-select (compare tray).
 *
 * Events emitted on document:
 *   parcel:selected        — { feature, jurisdictionId } | { feature: null }
 *   parcel:deselected      — {}
 *   parcel:compare-updated — { compared: Array<{feature, jurisdictionId}> }
 *   parcel:compare-full    — { max }
 */
window.PARCEL_SELECTION = (function () {
  'use strict';

  const MAX_COMPARE = 4;

  let _selected = null;   // { feature, jurisdictionId } | null
  let _compared = [];     // Array<{ feature, jurisdictionId }> — compare tray

  function _emit(type, detail) {
    document.dispatchEvent(new CustomEvent(type, { detail, bubbles: false }));
  }

  /* Select a single parcel (replaces any existing selection). */
  function select(feature, jurisdictionId) {
    _selected = feature ? { feature, jurisdictionId } : null;
    _emit('parcel:selected', { feature: feature || null, jurisdictionId: jurisdictionId || null });
  }

  /* Clear the active selection without touching the compare tray. */
  function deselect() {
    _selected = null;
    _emit('parcel:deselected', {});
  }

  function getSelected() {
    return _selected;
  }

  /* Add the currently-selected or a given parcel to the compare tray.
   * Returns true if added, false if already present or tray is full. */
  function addToCompare(feature, jurisdictionId) {
    if (!feature) return false;

    if (_compared.length >= MAX_COMPARE) {
      _emit('parcel:compare-full', { max: MAX_COMPARE });
      return false;
    }

    const pid = feature.properties?.parcel_id;
    if (pid && _compared.some(c => c.feature?.properties?.parcel_id === pid)) {
      return false; // already in tray
    }

    _compared.push({ feature, jurisdictionId });
    _emit('parcel:compare-updated', { compared: [..._compared] });
    return true;
  }

  /* Remove a parcel from the compare tray by its canonical parcel_id. */
  function removeFromCompare(parcelId) {
    const before = _compared.length;
    _compared = _compared.filter(c => c.feature?.properties?.parcel_id !== parcelId);
    if (_compared.length !== before) {
      _emit('parcel:compare-updated', { compared: [..._compared] });
    }
  }

  function clearCompare() {
    if (_compared.length === 0) return;
    _compared = [];
    _emit('parcel:compare-updated', { compared: [] });
  }

  function getCompared() {
    return [..._compared];
  }

  function isInCompare(parcelId) {
    return _compared.some(c => c.feature?.properties?.parcel_id === parcelId);
  }

  return {
    select,
    deselect,
    getSelected,
    addToCompare,
    removeFromCompare,
    clearCompare,
    getCompared,
    isInCompare,
    MAX_COMPARE,
  };
})();
