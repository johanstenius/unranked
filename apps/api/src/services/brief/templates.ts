import type { SearchIntent } from "../ai/anthropic.js";
import type { BriefStructure } from "../ai/anthropic.js";

type BriefForTemplate = {
	title: string;
	structure: BriefStructure;
	questions: string[];
	relatedKw: string[];
	suggestedInternalLinks: string[];
};

function formatStructureAsOutline(structure: BriefStructure): string {
	return structure.h2s
		.map((h2) => {
			const h3Lines = h2.h3s?.map((h3) => `### ${h3}\n{content}\n`) ?? [];
			return `## ${h2.title}\n{content}\n\n${h3Lines.join("\n")}`;
		})
		.join("\n");
}

function informationalTemplate(brief: BriefForTemplate): string {
	const internalLinks = brief.suggestedInternalLinks
		.slice(0, 3)
		.map((link) => `- [Related topic](${link})`)
		.join("\n");

	const questionsList = brief.questions
		.slice(0, 3)
		.map((q) => `- ${q}`)
		.join("\n");

	return `# ${brief.title}

{Intro paragraph: What the reader will learn and why it matters}

## Key Takeaways
- {Key point 1}
- {Key point 2}
- {Key point 3}

${formatStructureAsOutline(brief.structure)}

## Summary
{Concise summary of main points}

## Next Steps
${internalLinks || "- {Related topic links}"}

---
**Questions this content should answer:**
${questionsList || "- {Questions to address}"}
`;
}

function transactionalTemplate(brief: BriefForTemplate): string {
	const internalLinks = brief.suggestedInternalLinks
		.slice(0, 3)
		.map((link) => `- [Related](${link})`)
		.join("\n");

	return `# ${brief.title}

{Clear value proposition in one sentence}

## Overview
{What this product/service is and who it's for}

## Key Features
- {Feature 1 with benefit}
- {Feature 2 with benefit}
- {Feature 3 with benefit}

${formatStructureAsOutline(brief.structure)}

## How to Get Started
1. {Step 1}
2. {Step 2}
3. {Step 3}

## Pricing
{Pricing information or link}

## FAQ
### {Common question 1}
{Answer}

### {Common question 2}
{Answer}

## Related
${internalLinks || "- {Related topic links}"}
`;
}

function navigationalTemplate(brief: BriefForTemplate): string {
	const internalLinks = brief.suggestedInternalLinks
		.slice(0, 3)
		.map((link) => `- [${link}](${link})`)
		.join("\n");

	return `# ${brief.title}

{Brief introduction}

## Quick Links
${internalLinks || "- {Navigation links}"}

${formatStructureAsOutline(brief.structure)}

## Contact & Support
{How to get help or reach out}
`;
}

function commercialTemplate(brief: BriefForTemplate): string {
	const internalLinks = brief.suggestedInternalLinks
		.slice(0, 3)
		.map((link) => `- [Further reading](${link})`)
		.join("\n");

	const questionsList = brief.questions
		.slice(0, 3)
		.map((q) => `- ${q}`)
		.join("\n");

	const relatedKw = brief.relatedKw
		.slice(0, 5)
		.map((kw) => `- ${kw}`)
		.join("\n");

	return `# ${brief.title}

{Hook: Why this comparison/review matters to the reader}

## TL;DR
{Quick summary with recommendation}

## What We Evaluated
- {Criterion 1}
- {Criterion 2}
- {Criterion 3}

${formatStructureAsOutline(brief.structure)}

## Comparison Table
| Feature | Option A | Option B | Option C |
|---------|----------|----------|----------|
| {feature} | {detail} | {detail} | {detail} |

## Our Verdict
{Final recommendation based on use case}

## Further Reading
${internalLinks || "- {Related topic links}"}

---
**Questions this content should answer:**
${questionsList || "- {Questions to address}"}

**Related keywords to include:**
${relatedKw || "- {keywords}"}
`;
}

export function generateTemplate(
	brief: BriefForTemplate,
	intent: SearchIntent | null | undefined,
): string {
	switch (intent) {
		case "informational":
			return informationalTemplate(brief);
		case "transactional":
			return transactionalTemplate(brief);
		case "navigational":
			return navigationalTemplate(brief);
		case "commercial":
			return commercialTemplate(brief);
		default:
			return informationalTemplate(brief);
	}
}
