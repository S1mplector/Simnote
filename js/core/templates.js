// templates.js
// Journal entry templates with guided prompts
//
// ARCHITECTURE OVERVIEW:
// ----------------------
// This module defines pre-built templates for journal entries.
// Each template can include:
// - name: Display name
// - icon: Emoji icon
// - content: Initial content (usually empty)
// - desc: Description shown on hover
// - prompts: Array of guided writing questions
//
// USAGE:
// - Templates are rendered as cards in the template selection panel
// - Selected template initializes entry with name and prompts
// - GuidedPromptManager handles prompt display during writing

/**
 * Pre-defined journal entry templates.
 * Each template includes name, icon, description, and optional guided prompts.
 * 
 * @type {Object<string, {name: string, icon: string, content: string, desc: string, prompts?: string[]}>}
 */
export const TEMPLATES = {
  /** Blank template for free-form writing */
  blank:     { name: 'Blank', icon: '📝', content: '', desc:'Start with an empty page—perfect when you already know what you want to write.' },
  gratitude: { name: 'Gratitude', icon: '🙏', content: '', desc:'Great for ending the day on a positive note. List three things you appreciate.', prompts:['List three things you are grateful for today.','Why does each make you feel grateful?'] },
  reflect:   { name: 'Reflection', icon: '🌅', content: '', desc:'Ideal for a balanced daily review: celebrate wins and spot areas to grow.', prompts:['What went well today?','What could be improved?','What is one thing you learned?'] },
  meeting:   { name: 'Meeting Notes', icon: '📋', content: '', desc:'Capture important discussions and follow-ups quickly during meetings.', prompts:['What is the meeting topic?','Who attended?','Summarize key discussion points.','List action items.'] },
  dream:     { name: 'Dream Log', icon: '🌙', content: '', desc:'Jot down dreams first thing in the morning to improve recall and spot patterns.', prompts:['Describe your dream.','How did it make you feel?','Any symbols or themes you noticed?'] }
}; 