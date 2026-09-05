/**
 * LinguaBridge - Session History Manager Module
 * Manages saving and retrieving translation sessions in LocalStorage.
 */
class HistoryManager {
  constructor() {
    this.storageKey = 'linguabridge_translation_history';
    this.maxItems = 20;
  }

  /**
   * Add new translation session to history
   */
  addSession(item) {
    if (!item.nativeText || !item.englishText) return;

    const history = this.getHistory();
    
    const newItem = {
      id: Date.now().toString(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      sourceLangName: item.sourceLangName || 'Native Language',
      sourceLangCode: item.sourceLangCode || 'auto',
      nativeText: item.nativeText,
      englishText: item.englishText
    };

    // Prepend new item
    history.unshift(newItem);

    // Limit to max items
    if (history.length > this.maxItems) {
      history.pop();
    }

    try {
      localStorage.setItem(this.storageKey, JSON.stringify(history));
    } catch (err) {
      console.warn('LocalStorage save failed:', err);
    }

    return newItem;
  }

  /**
   * Get all saved history items
   */
  getHistory() {
    try {
      const data = localStorage.getItem(this.storageKey);
      return data ? JSON.parse(data) : [];
    } catch (err) {
      console.warn('LocalStorage read error:', err);
      return [];
    }
  }

  /**
   * Clear all history records
   */
  clearHistory() {
    try {
      localStorage.removeItem(this.storageKey);
    } catch (err) {
      console.warn('LocalStorage clear error:', err);
    }
  }
}
