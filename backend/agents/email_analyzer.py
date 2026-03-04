"""
Email Analyzer Agent

Uses Claude AI to analyze email importance based on user-defined criteria.
Provides importance scores, reasoning, and suggested actions.
"""

from clarity_sdk import agent, BaseAgent, AgentResult, AgentContext
from typing import Dict, Any
import logging
import os
import json

logger = logging.getLogger(__name__)


@agent(
    id="email-analyzer",
    name="Email Analyzer",
    description="Analyzes email importance using Claude AI based on user-defined criteria and context",
    category="email",
    inputs={
        "email": {
            "type": "object",
            "description": "Email object to analyze (sender, subject, snippet, body)",
            "required": True
        },
        "importance_criteria": {
            "type": "object",
            "description": "User's importance criteria (keywords, senders, rules)",
            "required": False
        },
        "user_context": {
            "type": "string",
            "description": "User's work context for better analysis (e.g., 'I'm a PM at TechCo')",
            "required": False
        }
    },
    outputs={
        "is_important": {
            "type": "boolean",
            "description": "Whether this email is important to the user"
        },
        "importance_score": {
            "type": "integer",
            "description": "Importance score from 0-100"
        },
        "reasoning": {
            "type": "string",
            "description": "AI explanation of why email is/isn't important"
        },
        "suggested_action": {
            "type": "string",
            "description": "Suggested action: 'read_now', 'read_later', 'archive', 'delete'"
        },
        "category": {
            "type": "string",
            "description": "Email category: 'work', 'personal', 'newsletter', 'promotional', 'urgent'"
        },
        "urgency_level": {
            "type": "string",
            "description": "Urgency level: 'low', 'medium', 'high', 'critical'"
        }
    },
    integrations=[],  # Uses Anthropic API via environment variable
    timeout=30
)
class EmailAnalyzerAgent(BaseAgent):
    """
    Analyzes emails using Claude AI for intelligent importance detection.

    This agent:
    1. Takes email data and user's importance criteria
    2. Uses Claude AI to understand context and intent
    3. Scores importance (0-100) with detailed reasoning
    4. Categorizes email and suggests actions
    5. Considers user's work context for personalized analysis

    Key features:
    - Context-aware (understands "email from my boss" vs generic rules)
    - Learns patterns (keywords, senders, topics)
    - Provides reasoning for transparency
    - Handles edge cases (urgent but not from VIP, etc.)
    """

    async def execute(self, context: AgentContext) -> AgentResult:
        """
        Analyze email importance using Claude AI.
        """
        try:
            # Get input data
            email = context.get_input("email")
            importance_criteria = context.get_input("importance_criteria", {})
            user_context = context.get_input("user_context", "")

            if not email:
                return AgentResult(
                    success=False,
                    error="No email provided for analysis"
                )

            context.log("info", f"Analyzing email: {email.get('subject', 'No subject')}")

            # Analyze email using Claude AI
            analysis = await self._analyze_with_claude(
                email=email,
                importance_criteria=importance_criteria,
                user_context=user_context,
                context=context
            )

            context.log("info", f"Analysis complete: score={analysis['importance_score']}, category={analysis['category']}")

            return AgentResult(
                success=True,
                data=analysis,
                metadata={
                    "agent_id": "email-analyzer",
                    "email_id": email.get("email_id"),
                    "analyzed_at": context.execution_id
                }
            )

        except Exception as e:
            logger.error(f"Email analysis failed: {e}")
            return AgentResult(
                success=False,
                error=f"Analysis failed: {str(e)}"
            )

    async def _analyze_with_claude(
        self,
        email: Dict[str, Any],
        importance_criteria: Dict[str, Any],
        user_context: str,
        context: AgentContext
    ) -> Dict[str, Any]:
        """
        Use Claude AI to analyze email importance.

        In production, this uses the Anthropic SDK:
        import anthropic
        client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))
        """

        # For development/testing, use rule-based analysis
        # In production, uncomment the Claude API section below

        sender = email.get("sender", "")
        subject = email.get("subject", "")
        snippet = email.get("snippet", "")
        body = email.get("body", snippet)

        # DEVELOPMENT MODE: Rule-based analysis
        score, reasoning, category, urgency, suggested_action = self._rule_based_analysis(
            sender=sender,
            subject=subject,
            snippet=snippet,
            body=body,
            importance_criteria=importance_criteria,
            user_context=user_context
        )

        context.log("info", f"[DEVELOPMENT MODE] Rule-based analysis complete: score={score}")

        return {
            "is_important": score >= 70,  # Threshold for importance
            "importance_score": score,
            "reasoning": reasoning,
            "suggested_action": suggested_action,
            "category": category,
            "urgency_level": urgency
        }

        # PRODUCTION CODE (uncomment when ready):
        """
        import anthropic

        # Check for API key
        api_key = os.environ.get("ANTHROPIC_API_KEY")
        if not api_key:
            context.log("warning", "ANTHROPIC_API_KEY not set, falling back to rule-based analysis")
            return self._fallback_analysis(email, importance_criteria)

        try:
            client = anthropic.Anthropic(api_key=api_key)

            # Build analysis prompt
            prompt = self._build_analysis_prompt(
                email=email,
                importance_criteria=importance_criteria,
                user_context=user_context
            )

            # Call Claude API
            message = client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=1024,
                messages=[
                    {"role": "user", "content": prompt}
                ]
            )

            # Parse Claude's response (expects JSON format)
            response_text = message.content[0].text
            analysis = json.loads(response_text)

            return {
                "is_important": analysis.get("importance_score", 0) >= 70,
                "importance_score": analysis.get("importance_score", 0),
                "reasoning": analysis.get("reasoning", ""),
                "suggested_action": analysis.get("suggested_action", "read_later"),
                "category": analysis.get("category", "unknown"),
                "urgency_level": analysis.get("urgency_level", "medium")
            }

        except Exception as e:
            logger.error(f"Claude API error: {e}")
            context.log("warning", f"Claude API failed, using fallback: {str(e)}")
            return self._fallback_analysis(email, importance_criteria)
        """

    def _rule_based_analysis(
        self,
        sender: str,
        subject: str,
        snippet: str,
        body: str,
        importance_criteria: Dict[str, Any],
        user_context: str
    ) -> tuple:
        """
        Simple rule-based analysis for development/fallback.

        Returns: (score, reasoning, category, urgency, suggested_action)
        """
        score = 50  # Base score
        reasoning_parts = []
        category = "unknown"
        urgency = "medium"

        # Check important senders
        important_senders = importance_criteria.get("important_senders", [])
        for important_sender in important_senders:
            if important_sender.lower() in sender.lower():
                score += 25
                reasoning_parts.append(f"Email from important sender: {important_sender}")
                category = "work"
                break

        # Check ignore senders
        ignore_senders = importance_criteria.get("ignore_senders", ["noreply@", "newsletter@"])
        for ignore_sender in ignore_senders:
            if ignore_sender.lower() in sender.lower():
                score -= 30
                reasoning_parts.append(f"Email from ignored sender pattern: {ignore_sender}")
                category = "newsletter"
                break

        # Check important keywords in subject/body
        keywords_important = importance_criteria.get("keywords_important", ["urgent", "deadline", "meeting", "approval"])
        text_to_check = (subject + " " + snippet + " " + body).lower()

        for keyword in keywords_important:
            if keyword.lower() in text_to_check:
                score += 15
                reasoning_parts.append(f"Contains important keyword: '{keyword}'")
                if keyword in ["urgent", "asap", "critical"]:
                    urgency = "high"
                    category = "urgent"

        # Check ignore keywords
        keywords_ignore = importance_criteria.get("keywords_ignore", ["unsubscribe", "promotional", "newsletter"])
        for keyword in keywords_ignore:
            if keyword.lower() in text_to_check:
                score -= 15
                reasoning_parts.append(f"Contains ignore keyword: '{keyword}'")
                category = "promotional"

        # Check for urgency indicators
        if any(word in text_to_check for word in ["urgent", "asap", "critical", "emergency", "immediately"]):
            urgency = "high"
            score += 10
            reasoning_parts.append("Contains urgency indicators")

        # Check for deadline mentions
        if any(word in text_to_check for word in ["deadline", "due", "eod", "end of day", "tomorrow"]):
            urgency = "high" if urgency != "critical" else "critical"
            score += 10
            reasoning_parts.append("Contains deadline mention")

        # Categorize based on content
        if category == "unknown":
            if any(word in sender.lower() for word in ["linkedin", "facebook", "twitter"]):
                category = "social"
                score -= 10
            elif any(word in text_to_check for word in ["meeting", "project", "client", "deadline"]):
                category = "work"
            elif any(word in sender.lower() for word in ["@personal", "@gmail", "@yahoo"]):
                category = "personal"

        # Cap score between 0-100
        score = max(0, min(100, score))

        # Determine suggested action
        if score >= 80:
            suggested_action = "read_now"
        elif score >= 60:
            suggested_action = "read_later"
        elif score >= 30:
            suggested_action = "archive"
        else:
            suggested_action = "delete"

        # Build reasoning
        if not reasoning_parts:
            reasoning_parts.append("Standard email with no special indicators")

        reasoning = " | ".join(reasoning_parts)

        return score, reasoning, category, urgency, suggested_action

    def _build_analysis_prompt(
        self,
        email: Dict[str, Any],
        importance_criteria: Dict[str, Any],
        user_context: str
    ) -> str:
        """
        Build prompt for Claude AI analysis.
        """
        prompt = f"""You are an email importance analyzer. Analyze this email and determine if it's important to the user.

USER CONTEXT:
{user_context or "No specific context provided"}

IMPORTANCE CRITERIA:
Important Senders: {', '.join(importance_criteria.get('important_senders', []))}
Ignore Senders: {', '.join(importance_criteria.get('ignore_senders', []))}
Important Keywords: {', '.join(importance_criteria.get('keywords_important', []))}
Ignore Keywords: {', '.join(importance_criteria.get('keywords_ignore', []))}

EMAIL TO ANALYZE:
From: {email.get('sender', 'Unknown')}
Subject: {email.get('subject', 'No subject')}
Preview: {email.get('snippet', '')}
Body: {email.get('body', 'Body not available')[:500]}

Analyze this email and respond ONLY with a JSON object in this exact format:
{{
  "importance_score": <0-100>,
  "reasoning": "<explain why this email is/isn't important>",
  "category": "<work|personal|newsletter|promotional|urgent>",
  "urgency_level": "<low|medium|high|critical>",
  "suggested_action": "<read_now|read_later|archive|delete>"
}}

Consider:
- Does this match the user's importance criteria?
- Is it from an important sender?
- Does it contain urgent keywords or deadlines?
- Is it actually important or just marketing/noise?
- What action should the user take?

Respond ONLY with the JSON object, no other text."""

        return prompt
