import type { Job } from "@/types";

export function generateInterviewQuestions(job: Job): string[] {
  const title = job.title.toLowerCase();
  const requirements = job.requirements.join(' ').toLowerCase();

  const isSoftwareDev = title.includes('developer') || title.includes('engineer') || title.includes('programmer') || requirements.includes('programming');
  const isDataScience = title.includes('data') || title.includes('analyst') || title.includes('scientist') || requirements.includes('python') || requirements.includes('machine learning');
  const isDesign = title.includes('designer') || title.includes('ux') || title.includes('ui') || requirements.includes('design');
  const isManagement = title.includes('manager') || title.includes('lead') || title.includes('director') || requirements.includes('leadership');
  const isMarketing = title.includes('marketing') || title.includes('sales') || requirements.includes('campaign');

  if (isSoftwareDev) {
    return [
      "Tell me about yourself and your background in software development.",
      "Can you walk me through a challenging project you've worked on and how you overcame the difficulties?",
      "How do you approach debugging a complex issue in your code?",
      "Describe your experience with version control systems like Git.",
      "How do you stay updated with the latest technologies and best practices?",
      "Tell me about a time when you had to learn a new technology quickly.",
      "How do you handle code reviews and feedback from peers?",
      "What are your thoughts on testing and quality assurance?",
      "How do you prioritize tasks when working on multiple projects?",
      "Where do you see yourself in 5 years in your software development career?"
    ];
  } else if (isDataScience) {
    return [
      "Tell me about your experience with data analysis and what tools you use.",
      "Can you explain a data science project you've worked on from start to finish?",
      "How do you handle missing or incomplete data in your analysis?",
      "Describe your experience with statistical modeling and machine learning algorithms.",
      "How do you communicate complex data insights to non-technical stakeholders?",
      "Tell me about a time when your analysis led to a significant business decision.",
      "What are your thoughts on data privacy and ethical considerations in data science?",
      "How do you approach feature engineering for machine learning models?",
      "Describe your experience with data visualization tools.",
      "What challenges have you faced in deploying machine learning models to production?"
    ];
  } else if (isDesign) {
    return [
      "Tell me about your design process and how you approach new projects.",
      "Can you walk me through a design project that you're particularly proud of?",
      "How do you handle feedback and revisions on your designs?",
      "Describe your experience with design tools and software.",
      "How do you ensure your designs are user-friendly and accessible?",
      "Tell me about a time when you balanced aesthetics with functionality.",
      "How do you stay inspired and updated with current design trends?",
      "Describe your experience working with cross-functional teams.",
      "How do you approach user research and usability testing?",
      "What are your thoughts on the role of design in business success?"
    ];
  } else if (isManagement) {
    return [
      "Tell me about your leadership experience and management style.",
      "Can you describe a time when you successfully led a team through a challenging project?",
      "How do you handle conflict resolution within your team?",
      "Describe your approach to performance management and employee development.",
      "How do you set goals and measure success for your team?",
      "Tell me about a difficult decision you had to make as a manager.",
      "How do you foster innovation and creativity in your team?",
      "Describe your experience with budgeting and resource allocation.",
      "How do you stay motivated and motivated your team during tough times?",
      "What are your career goals in management and leadership?"
    ];
  } else if (isMarketing) {
    return [
      "Tell me about your experience in marketing and what types of campaigns you've worked on.",
      "Can you walk me through a successful marketing campaign you've led?",
      "How do you measure the success of marketing initiatives?",
      "Describe your experience with digital marketing channels and tools.",
      "How do you identify and understand your target audience?",
      "Tell me about a time when a marketing strategy didn't work as expected and how you adapted.",
      "How do you stay updated with marketing trends and consumer behavior?",
      "Describe your experience with content creation and brand storytelling.",
      "How do you collaborate with sales and other departments?",
      "What are your thoughts on the future of marketing and emerging technologies?"
    ];
  } else {
    // Generic questions for other roles
    return [
      "Tell me about yourself and your professional background.",
      "Can you walk me through your most relevant experience for this position?",
      "What attracted you to this role and our company?",
      "Describe a challenging situation you've faced at work and how you handled it.",
      "How do you prioritize tasks and manage your time effectively?",
      "Tell me about a time when you received constructive criticism and how you responded.",
      "What are your strengths and areas for development?",
      "How do you approach problem-solving in your work?",
      "Describe your experience working in teams or collaborating with others.",
      "Where do you see yourself professionally in the next few years?"
    ];
  }
}

export function calculateInterviewRating(responses: string[]): number {
  if (responses.length === 0) return 5;

  let totalScore = 0;
  let responseCount = 0;

  responses.forEach(response => {
    if (!response.trim()) return; // Skip empty responses

    responseCount++;
    let score = 0;

    // Length analysis (responses should be substantial but not too long)
    const wordCount = response.trim().split(/\s+/).length;
    if (wordCount >= 10 && wordCount <= 200) {
      score += 2; // Good length
    } else if (wordCount >= 5) {
      score += 1; // Acceptable length
    }

    // Content quality indicators
    const lowerResponse = response.toLowerCase();

    // Positive indicators
    const positiveIndicators = [
      'experience', 'learned', 'challenged', 'solved', 'improved',
      'team', 'collaboration', 'communication', 'leadership',
      'problem.solving', 'analytical', 'creative', 'innovative'
    ];

    let positiveMatches = 0;
    positiveIndicators.forEach(indicator => {
      if (lowerResponse.includes(indicator.replace('.', ''))) {
        positiveMatches++;
      }
    });

    if (positiveMatches >= 2) score += 2;
    else if (positiveMatches >= 1) score += 1;

    // Structure indicators (responses with examples, results, etc.)
    const structureIndicators = ['for example', 'specifically', 'result', 'outcome', 'achieved'];
    let structureMatches = 0;
    structureIndicators.forEach(indicator => {
      if (lowerResponse.includes(indicator)) {
        structureMatches++;
      }
    });

    if (structureMatches >= 1) score += 1;

    totalScore += Math.min(score, 5); // Cap per response at 5
  });

  if (responseCount === 0) return 5;

  // Calculate average score and convert to 1-10 scale
  const averageScore = totalScore / responseCount;
  const rating = Math.round((averageScore / 5) * 9 + 1); // Scale to 1-10

  return Math.max(1, Math.min(10, rating)); // Ensure 1-10 range
}