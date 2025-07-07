export class MoodEmojiMapper {
  // Extensive list of keyword groups mapped to an emoji that best represents the mood
  static #mappings = [
    { emoji: "😊", keywords: ["happy", "joy", "joyful", "glad", "great", "good", "content", "cheerful", "delighted"] },
    { emoji: "😢", keywords: ["sad", "down", "blue", "unhappy", "depressed", "tear", "cry", "sorrow"] },
    { emoji: "😠", keywords: ["angry", "mad", "furious", "irritated", "annoyed", "rage"] },
    { emoji: "😴", keywords: ["tired", "sleepy", "exhausted", "sleep", "drowsy", "weary"] },
    { emoji: "😍", keywords: ["love", "lovely", "romantic", "affection", "in love", "crush"] },
    { emoji: "🤩", keywords: ["excited", "thrilled", "eager", "enthusiastic", "ecstatic", "amazed"] },
    { emoji: "🤒", keywords: ["sick", "ill", "unwell", "fever", "cold", "flu"] },
    { emoji: "😟", keywords: ["anxious", "nervous", "worried", "concerned", "uneasy"] },
    { emoji: "😎", keywords: ["cool", "relaxed", "chill", "awesome"] },
    { emoji: "😃", keywords: ["smile", "smiling", "grin", "laugh", "laughing"] },
    { emoji: "😭", keywords: ["heartbroken", "devastated", "miserable", "grieving"] },
    { emoji: "😇", keywords: ["blessed", "grateful", "thankful"] },
    { emoji: "😰", keywords: ["scared", "afraid", "fear", "terrified"] },
    { emoji: "😕", keywords: ["confused", "unsure", "perplexed", "really bored", "bored", "boredom"] },
    { emoji: "😑", keywords: ["neutral", "meh", "ok", "okay", "alright", "indifferent", "weird", "weirded out", "weirded"] },
    { emoji: "🤗", keywords: ["hopeful", "optimistic", "reassured", "hug", "comfort", "comforted"] },
    { emoji: "🤔", keywords: ["thinking", "pondering", "reflective", "curious", "pondering", "ponder", "pondering"] },
    { emoji: "🙂", keywords: ["fine", "ok", "okay", "meh", "alright"] }
  ];

  /**
   * Return the first matching emoji for a given mood text.
   * @param {string} text The mood text entered by the user.
   * @returns {string} Emoji character or empty string if no match found.
   */
  static getEmoji(text = "") {
    const lower = text.toLowerCase();
    for (const map of this.#mappings) {
      if (map.keywords.some(kw => lower.includes(kw))) {
        return map.emoji;
      }
    }
    return ""; // no match
  }
} 