// Bright Data Scraping Service with Sentiment Analysis
// For yc0n1c's PoSc Sentinel

interface ScrapingResult {
  url: string;
  title: string;
  content: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  sentimentScore: number;
  keywords: string[];
  timestamp: Date;
  source: string;
}

interface StartupMentions {
  startupName: string;
  mentions: ScrapingResult[];
  totalMentions: number;
  positiveMentions: number;
  negativeMentions: number;
  neutralMentions: number;
  averageSentimentScore: number;
  trendingKeywords: string[];
  lastUpdated: Date;
}

interface SentimentAnalysis {
  text: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  score: number;
  confidence: number;
  keywords: string[];
}

class BrightDataService {
  private apiKey: string;
  private baseUrl: string;
  private startupKeywords: string[];

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.brightdata.com';
    this.startupKeywords = [
      'yc0n1c',
      'yconic',
      'proof of scale',
      'posc',
      'ambient agent',
      'startup monitoring',
      'revenue tracking',
      'stripe analytics'
    ];
  }

  /**
   * Analyze sentiment of text using simple keyword-based approach
   * In production, you'd use a proper NLP service like OpenAI, Google NLP, or AWS Comprehend
   */
  private analyzeSentiment(text: string): SentimentAnalysis {
    const lowerText = text.toLowerCase();
    
    // Positive keywords
    const positiveKeywords = [
      'success', 'growth', 'revenue', 'profit', 'funding', 'investment',
      'expansion', 'scaling', 'traction', 'customers', 'sales', 'increase',
      'positive', 'good', 'great', 'excellent', 'amazing', 'outstanding',
      'innovative', 'breakthrough', 'revolutionary', 'disruptive', 'leading',
      'market leader', 'successful', 'profitable', 'growing', 'expanding'
    ];

    // Negative keywords
    const negativeKeywords = [
      'failure', 'loss', 'decline', 'decrease', 'struggling', 'failing',
      'bankruptcy', 'shutdown', 'layoffs', 'downsizing', 'problems',
      'issues', 'complaints', 'negative', 'bad', 'terrible', 'awful',
      'disappointing', 'underperforming', 'struggling', 'declining'
    ];

    let positiveScore = 0;
    let negativeScore = 0;

    // Count positive keywords
    positiveKeywords.forEach(keyword => {
      const regex = new RegExp(keyword, 'gi');
      const matches = (lowerText.match(regex) || []).length;
      positiveScore += matches;
    });

    // Count negative keywords
    negativeKeywords.forEach(keyword => {
      const regex = new RegExp(keyword, 'gi');
      const matches = (lowerText.match(regex) || []).length;
      negativeScore += matches;
    });

    // Calculate sentiment score (-1 to 1)
    const totalWords = text.split(' ').length;
    const sentimentScore = totalWords > 0 ? (positiveScore - negativeScore) / totalWords : 0;
    
    // Determine sentiment category
    let sentiment: 'positive' | 'negative' | 'neutral';
    if (sentimentScore > 0.1) {
      sentiment = 'positive';
    } else if (sentimentScore < -0.1) {
      sentiment = 'negative';
    } else {
      sentiment = 'neutral';
    }

    // Extract relevant keywords
    const allKeywords = [...positiveKeywords, ...negativeKeywords];
    const foundKeywords = allKeywords.filter(keyword => 
      lowerText.includes(keyword.toLowerCase())
    );

    return {
      text,
      sentiment,
      score: sentimentScore,
      confidence: Math.abs(sentimentScore),
      keywords: foundKeywords
    };
  }

  /**
   * Scrape news articles about the startup
   */
  async scrapeNewsArticles(startupName: string): Promise<ScrapingResult[]> {
    console.log(`🔍 Scraping news articles for: ${startupName}`);
    
    try {
      // Simulate Bright Data API call for news scraping
      // In production, you'd use actual Bright Data API
      const mockArticles = [
        {
          url: 'https://techcrunch.com/2024/01/15/yc0n1c-startup-revolutionizing-revenue-tracking',
          title: 'Yc0n1c Startup Revolutionizing Revenue Tracking with AI',
          content: 'Yc0n1c, a promising startup in the revenue tracking space, has shown impressive growth with their innovative PoSc (Proof of Scale) monitoring system. The company has achieved significant traction with their ambient agent technology.',
          source: 'TechCrunch'
        },
        {
          url: 'https://venturebeat.com/2024/01/10/startup-spotlight-yconic-posc-sentinel',
          title: 'Startup Spotlight: Yconic\'s PoSc Sentinel Shows Promise',
          content: 'Yconic\'s ambient PoSc sentinel is gaining attention in the startup ecosystem. The company has demonstrated strong revenue growth and customer adoption.',
          source: 'VentureBeat'
        },
        {
          url: 'https://startupdaily.net/2024/01/05/yconic-revenue-analytics-platform',
          title: 'Yconic Launches Advanced Revenue Analytics Platform',
          content: 'The new platform offers comprehensive revenue tracking and analysis capabilities, helping startups monitor their growth metrics effectively.',
          source: 'Startup Daily'
        }
      ];

      const results: ScrapingResult[] = [];

      for (const article of mockArticles) {
        const sentiment = this.analyzeSentiment(article.content);
        
        results.push({
          url: article.url,
          title: article.title,
          content: article.content,
          sentiment: sentiment.sentiment,
          sentimentScore: sentiment.score,
          keywords: sentiment.keywords,
          timestamp: new Date(),
          source: article.source
        });
      }

      console.log(`✅ Scraped ${results.length} news articles`);
      return results;

    } catch (error) {
      console.error('❌ Error scraping news articles:', error);
      return [];
    }
  }

  /**
   * Scrape social media mentions
   */
  async scrapeSocialMediaMentions(startupName: string): Promise<ScrapingResult[]> {
    console.log(`📱 Scraping social media mentions for: ${startupName}`);
    
    try {
      // Simulate social media scraping
      const mockMentions = [
        {
          url: 'https://twitter.com/startup_analyst/status/123456789',
          title: 'Twitter Post about Yc0n1c',
          content: 'Just discovered @yc0n1c - their PoSc monitoring is incredible! The revenue tracking features are game-changing for startups. #startup #revenue #analytics',
          source: 'Twitter'
        },
        {
          url: 'https://linkedin.com/posts/tech-founder-123',
          title: 'LinkedIn Post about Yconic',
          content: 'Excited to share that we\'ve integrated Yconic\'s PoSc sentinel into our startup. The insights are invaluable for tracking our growth metrics.',
          source: 'LinkedIn'
        },
        {
          url: 'https://reddit.com/r/startups/comments/abc123',
          title: 'Reddit Discussion about Yc0n1c',
          content: 'Has anyone tried Yc0n1c\'s revenue tracking platform? Looking for feedback on their PoSc monitoring features.',
          source: 'Reddit'
        }
      ];

      const results: ScrapingResult[] = [];

      for (const mention of mockMentions) {
        const sentiment = this.analyzeSentiment(mention.content);
        
        results.push({
          url: mention.url,
          title: mention.title,
          content: mention.content,
          sentiment: sentiment.sentiment,
          sentimentScore: sentiment.score,
          keywords: sentiment.keywords,
          timestamp: new Date(),
          source: mention.source
        });
      }

      console.log(`✅ Scraped ${results.length} social media mentions`);
      return results;

    } catch (error) {
      console.error('❌ Error scraping social media mentions:', error);
      return [];
    }
  }

  /**
   * Scrape blog posts and articles
   */
  async scrapeBlogPosts(startupName: string): Promise<ScrapingResult[]> {
    console.log(`📝 Scraping blog posts for: ${startupName}`);
    
    try {
      // Simulate blog scraping
      const mockBlogs = [
        {
          url: 'https://medium.com/@startup-founder/yconic-revenue-tracking-review',
          title: 'Yconic Revenue Tracking Platform Review',
          content: 'After using Yconic\'s PoSc monitoring for 3 months, I can say it\'s one of the best revenue tracking tools I\'ve used. The insights are actionable and the UI is intuitive.',
          source: 'Medium'
        },
        {
          url: 'https://substack.com/startup-insights/p/yconic-posc-analysis',
          title: 'Deep Dive: Yconic\'s PoSc Technology',
          content: 'Yconic has developed an innovative approach to startup monitoring. Their ambient PoSc sentinel provides real-time insights that are crucial for growth-stage companies.',
          source: 'Substack'
        }
      ];

      const results: ScrapingResult[] = [];

      for (const blog of mockBlogs) {
        const sentiment = this.analyzeSentiment(blog.content);
        
        results.push({
          url: blog.url,
          title: blog.title,
          content: blog.content,
          sentiment: sentiment.sentiment,
          sentimentScore: sentiment.score,
          keywords: sentiment.keywords,
          timestamp: new Date(),
          source: blog.source
        });
      }

      console.log(`✅ Scraped ${results.length} blog posts`);
      return results;

    } catch (error) {
      console.error('❌ Error scraping blog posts:', error);
      return [];
    }
  }

  /**
   * Comprehensive startup monitoring with sentiment analysis
   */
  async monitorStartup(startupName: string): Promise<StartupMentions> {
    console.log(`🚀 Starting comprehensive monitoring for: ${startupName}`);
    console.log('='.repeat(50));

    try {
      // Scrape from multiple sources
      const [newsArticles, socialMentions, blogPosts] = await Promise.all([
        this.scrapeNewsArticles(startupName),
        this.scrapeSocialMediaMentions(startupName),
        this.scrapeBlogPosts(startupName)
      ]);

      // Combine all mentions
      const allMentions = [...newsArticles, ...socialMentions, ...blogPosts];

      // Calculate statistics
      const totalMentions = allMentions.length;
      const positiveMentions = allMentions.filter(m => m.sentiment === 'positive').length;
      const negativeMentions = allMentions.filter(m => m.sentiment === 'negative').length;
      const neutralMentions = allMentions.filter(m => m.sentiment === 'neutral').length;

      const averageSentimentScore = allMentions.length > 0 
        ? allMentions.reduce((sum, m) => sum + m.sentimentScore, 0) / allMentions.length 
        : 0;

      // Extract trending keywords
      const allKeywords = allMentions.flatMap(m => m.keywords);
      const keywordCounts = allKeywords.reduce((acc, keyword) => {
        acc[keyword] = (acc[keyword] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const trendingKeywords = Object.entries(keywordCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([keyword]) => keyword);

      const result: StartupMentions = {
        startupName,
        mentions: allMentions,
        totalMentions,
        positiveMentions,
        negativeMentions,
        neutralMentions,
        averageSentimentScore,
        trendingKeywords,
        lastUpdated: new Date()
      };

      // Log comprehensive results
      console.log('\n📊 STARTUP MONITORING RESULTS:');
      console.log('='.repeat(40));
      console.log(`🏢 Startup: ${result.startupName}`);
      console.log(`📈 Total Mentions: ${result.totalMentions}`);
      console.log(`✅ Positive Mentions: ${result.positiveMentions}`);
      console.log(`❌ Negative Mentions: ${result.negativeMentions}`);
      console.log(`😐 Neutral Mentions: ${result.neutralMentions}`);
      console.log(`📊 Average Sentiment Score: ${result.averageSentimentScore.toFixed(3)}`);
      console.log(`🔥 Trending Keywords: ${result.trendingKeywords.join(', ')}`);
      console.log(`📅 Last Updated: ${result.lastUpdated.toISOString()}`);

      // Log sample mentions
      if (result.mentions.length > 0) {
        console.log('\n📰 SAMPLE MENTIONS:');
        console.log('='.repeat(30));
        result.mentions.slice(0, 3).forEach((mention, index) => {
          console.log(`${index + 1}. ${mention.source}: ${mention.title}`);
          console.log(`   Sentiment: ${mention.sentiment} (${mention.sentimentScore.toFixed(3)})`);
          console.log(`   Keywords: ${mention.keywords.join(', ')}`);
          console.log('');
        });
      }

      return result;

    } catch (error) {
      console.error('❌ Error monitoring startup:', error);
      throw error;
    }
  }

  /**
   * Get sentiment trends over time
   */
  async getSentimentTrends(startupName: string, days: number = 30): Promise<any> {
    console.log(`📈 Analyzing sentiment trends for ${startupName} over ${days} days`);
    
    // Simulate historical sentiment data
    const trends = {
      startupName,
      period: `${days} days`,
      averageSentiment: 0.65,
      sentimentTrend: 'increasing',
      peakSentiment: 0.85,
      lowSentiment: 0.45,
      mentionGrowth: 15.5, // percentage
      positiveGrowth: 20.3,
      negativeGrowth: -5.2
    };

    console.log('📊 Sentiment Trends:');
    console.log(`  Average Sentiment: ${trends.averageSentiment}`);
    console.log(`  Trend: ${trends.sentimentTrend}`);
    console.log(`  Mention Growth: ${trends.mentionGrowth}%`);
    console.log(`  Positive Growth: ${trends.positiveGrowth}%`);

    return trends;
  }
}

export { BrightDataService, type ScrapingResult, type StartupMentions, type SentimentAnalysis }; 