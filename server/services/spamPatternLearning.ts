// server/services/spamPatternLearning.ts

import { storage } from "../storage";

export interface SpamPattern {
  id: string;
  pattern: string;
  category: "food" | "retail" | "service" | "test" | "other";
  detectionCount: number;
  falsePositiveCount: number;
  confidence: string; // decimal as string
  lastDetected: Date;
  createdAt: Date;
  updatedAt: Date;
}

class SpamPatternLearning {
  private patterns: Map<string, SpamPattern> = new Map();
  private readonly CONFIDENCE_THRESHOLD = 0.85;
  private readonly MIN_DETECTIONS = 3;
  private readonly MIN_SAVE_CONFIDENCE = 0.3;
  private initialized = false;

  /**
   * Initialize and load patterns from database
   */
  async initialize() {
    if (this.initialized) return;

    try {
      const savedPatterns = await storage.getSpamPatterns();

      // ✅ LOAD ALL PATTERNS from database
      savedPatterns.forEach((p) => this.patterns.set(p.pattern, p));

      // ✅ COUNT high-quality patterns for reporting
      const highQualityCount = savedPatterns.filter(
        (p) =>
          parseFloat(p.confidence) >= 0.5 &&
          p.detectionCount >= this.MIN_DETECTIONS
      ).length;

      console.log(
        `📚 Loaded ${
          this.patterns.size
        } spam patterns from database (${highQualityCount} high-quality, ${
          this.patterns.size - highQualityCount
        } learning)`
      );
      // ✅ NEW: Clean any construction patterns that were wrongly learned
      await this.cleanConstructionPatterns();
      this.initialized = true;
    } catch (error) {
      console.error("❌ Failed to load spam patterns:", error);
      this.initialized = true; // Continue anyway
    }
  }

  /**
   * Check if message matches learned spam patterns
   */
  async checkAgainstLearnedPatterns(message: string): Promise<{
    isSpam: boolean;
    confidence: number;
    matchedPattern?: string;
    category?: string;
  }> {
    await this.ensureInitialized();

    const lowerMessage = message.toLowerCase();

    // ✅ NEW: CONSTRUCTION WHITELIST - Never mark these as spam
    const constructionWhitelist = [
      "build a house",
      "build a home",
      "construction",
      "renovation",
      "renovation project",
      "remodel",
      "contractor",
      "build out",
      "built out",
      "buildout",
      "deck",
      "garage",
      "warehouse",
      "commercial kitchen",
      "restaurant kitchen",
      "kitchen renovation",
      "MEP",
      "MEP work",
      "ventilation",
      "gas lines",
      "electrical work",
      "plumbing",
      "structural",
      "site visit",
    ];

    // ✅ If message contains ANY construction terms, bypass spam check
    if (constructionWhitelist.some((term) => lowerMessage.includes(term))) {
      console.log("✅ Construction whitelist bypass:", message);
      return { isSpam: false, confidence: 0 };
    }

    for (const [pattern, data] of Array.from(this.patterns.entries())) {
      const confidence = parseFloat(data.confidence);

      if (
        lowerMessage.includes(pattern) &&
        confidence >= this.CONFIDENCE_THRESHOLD
      ) {
        // Update detection count asynchronously
        this.recordDetection(pattern).catch((err) =>
          console.error("Failed to record detection:", err)
        );

        return {
          isSpam: true,
          confidence,
          matchedPattern: pattern,
          category: data.category,
        };
      }
    }

    return { isSpam: false, confidence: 0 };
  }

  /**
   * Learn from confirmed spam
   */
  async learnFromSpam(message: string, category: string) {
    await this.ensureInitialized();

    console.log(`🧠 Learning from spam: "${message}" [${category}]`);

    // ✅ NEW: PREVENT LEARNING CONSTRUCTION TERMS AS SPAM
    const constructionWhitelist = [
      "build a house",
      "build a home",
      "construction",
      "renovation",
      "renovation project",
      "remodel",
      "contractor",
      "build out",
      "built out",
      "buildout",
      "deck",
      "garage",
      "warehouse",
      "commercial kitchen",
      "restaurant kitchen",
      "kitchen renovation",
      "MEP",
      "MEP work",
      "ventilation",
      "gas lines",
      "electrical work",
      "plumbing",
      "structural",
      "site visit",
    ];

    const lowerMessage = message.toLowerCase();
    if (constructionWhitelist.some((term) => lowerMessage.includes(term))) {
      console.warn(
        "⚠️ BLOCKED: Attempted to learn construction term as spam:",
        message
      );
      return; // ✅ Don't learn this pattern
    }

    // Extract potential patterns (2-4 word phrases)
    const words = message.toLowerCase().split(/\s+/);
    const patterns: string[] = [];

    // Generate 2-word patterns
    for (let i = 0; i < words.length - 1; i++) {
      const pattern = `${words[i]} ${words[i + 1]}`;
      if (pattern.length > 5) patterns.push(pattern);
    }

    // Generate 3-word patterns
    for (let i = 0; i < words.length - 2; i++) {
      const pattern = `${words[i]} ${words[i + 1]} ${words[i + 2]}`;
      if (pattern.length > 8) patterns.push(pattern);
    }

    // Update or create patterns
    let newPatternsCount = 0;
    for (const pattern of patterns) {
      if (this.patterns.has(pattern)) {
        const existing = this.patterns.get(pattern)!;
        existing.detectionCount++;
        existing.confidence = this.calculateConfidence(existing);
        existing.lastDetected = new Date();
        existing.updatedAt = new Date();
      } else {
        this.patterns.set(pattern, {
          id: crypto.randomUUID(),
          pattern,
          category: category as any,
          detectionCount: 1,
          falsePositiveCount: 0,
          confidence: "0.5",
          lastDetected: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        newPatternsCount++;
      }
    }

    console.log(
      `✅ Learned ${newPatternsCount} new patterns, updated ${
        patterns.length - newPatternsCount
      } existing patterns`
    );

    await this.savePatterns();
  }

  /**
   * Mark a pattern as false positive (construction was misidentified as spam)
   */
  async markFalsePositive(pattern: string) {
    await this.ensureInitialized();

    const existing = this.patterns.get(pattern);
    if (existing) {
      existing.falsePositiveCount++;
      existing.confidence = this.calculateConfidence(existing);
      existing.updatedAt = new Date();

      console.log(
        `⚠️ Pattern "${pattern}" marked as false positive (confidence: ${existing.confidence})`
      );

      await this.savePatterns();
    }
  }

  /**
   * Clean up any construction terms that were wrongly learned as spam
   */
  async cleanConstructionPatterns() {
    const constructionTerms = [
      "build a",
      "build house",
      "build home",
      "construction",
      "renovation",
      "remodel",
      "contractor",
      "build out",
      "built out",
      "deck",
      "garage",
      "warehouse",
      "commercial kitchen",
      "restaurant kitchen",
      "kitchen renovation",
      "mep",
      "ventilation",
      "gas lines",
      "electrical",
      "plumbing",
      "structural",
    ];

    let removedCount = 0;
    for (const [pattern, data] of Array.from(this.patterns.entries())) {
      if (constructionTerms.some((term) => pattern.includes(term))) {
        this.patterns.delete(pattern);
        removedCount++;
        console.log(`🧹 Removed construction pattern from spam: "${pattern}"`);
      }
    }

    if (removedCount > 0) {
      console.log(
        `🧹 Cleaned ${removedCount} construction patterns from spam database`
      );
      await this.savePatterns();
    }

    return removedCount;
  }

  /**
   * Calculate confidence score based on accuracy, recency, and volume
   */
  private calculateConfidence(pattern: SpamPattern): string {
    const detections = pattern.detectionCount;
    const falsePositives = pattern.falsePositiveCount;

    // Accuracy: ratio of correct detections
    const accuracy = detections / (detections + falsePositives);

    // Recency: newer patterns get higher scores
    const recency = this.getRecencyScore(pattern.lastDetected);

    // Volume: more detections = more confidence (capped at 10)
    const volume = Math.min(detections / 10, 1);

    // Weighted average
    const confidence = accuracy * 0.6 + recency * 0.2 + volume * 0.2;

    return confidence.toFixed(2);
  }

  /**
   * Get recency score (newer = higher score)
   */
  private getRecencyScore(date: Date): number {
    const daysSince = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince < 7) return 1.0;
    if (daysSince < 30) return 0.8;
    if (daysSince < 90) return 0.6;
    return 0.4;
  }

  /**
   * Record a pattern detection
   */
  private async recordDetection(pattern: string) {
    const existing = this.patterns.get(pattern);
    if (existing) {
      existing.detectionCount++;
      existing.lastDetected = new Date();
      existing.updatedAt = new Date();
      existing.confidence = this.calculateConfidence(existing);
      await this.savePatterns();
    }
  }

  /**
   * Save patterns to database (only high-quality ones)
   */
  private async savePatterns() {
    // ✅ Save all patterns above minimum confidence
    const patternsArray = Array.from(this.patterns.values()).filter(
      (p) => parseFloat(p.confidence) >= this.MIN_SAVE_CONFIDENCE
    );

    try {
      await storage.saveSpamPatterns(patternsArray);

      const highQuality = patternsArray.filter(
        (p) =>
          parseFloat(p.confidence) >= this.CONFIDENCE_THRESHOLD &&
          p.detectionCount >= this.MIN_DETECTIONS
      ).length;

      const learning = patternsArray.length - highQuality;

      console.log(
        `💾 Saved ${patternsArray.length} patterns (${highQuality} active, ${learning} learning)`
      );
    } catch (error) {
      console.error("❌ Failed to save spam patterns:", error);
    }
  }

  /**
   * Get top spam patterns for reporting
   */
  getTopPatterns(limit: number = 20): SpamPattern[] {
    return Array.from(this.patterns.values())
      .sort((a, b) => parseFloat(b.confidence) - parseFloat(a.confidence))
      .slice(0, limit);
  }

  /**
   * Get statistics about learned patterns
   */
  getStats() {
    const patterns = Array.from(this.patterns.values());
    const highConfidence = patterns.filter(
      (p) => parseFloat(p.confidence) >= 0.85
    ).length;
    const byCategory = patterns.reduce((acc, p) => {
      acc[p.category] = (acc[p.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: patterns.length,
      highConfidence,
      byCategory,
      avgConfidence:
        patterns.reduce((sum, p) => sum + parseFloat(p.confidence), 0) /
          patterns.length || 0,
    };
  }

  private async ensureInitialized() {
    if (!this.initialized) {
      await this.initialize();
    }
  }
}

export const spamPatternLearning = new SpamPatternLearning();
