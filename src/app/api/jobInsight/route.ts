import { NextResponse } from "next/server";
import OpenAI from "openai";
import { supabase } from "@/lib/supabaseClient";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// Pricing config (per 1M tokens)
const pricing = {
  "gpt-5-mini": {
    input: 0.25 / 1_000_000,
    cached_input: 0.025 / 1_000_000,
    output: 2.0 / 1_000_000,
  },
  "gpt-5": {
    input: 1.25 / 1_000_000,
    cached_input: 0.125 / 1_000_000,
    output: 10.0 / 1_000_000,
  },
};

function calculateCost(model: keyof typeof pricing, usage: any) {
  if (!usage) return null;
  const p = pricing[model];

  const inputTokens =
    usage.prompt_tokens_details?.cached_tokens !== undefined
      ? usage.prompt_tokens - usage.prompt_tokens_details.cached_tokens
      : usage.prompt_tokens;

  const cachedTokens = usage.prompt_tokens_details?.cached_tokens || 0;
  const completionTokens = usage.completion_tokens;

  const inputCost = inputTokens * p.input;
  const cachedCost = cachedTokens * p.cached_input;
  const outputCost = completionTokens * p.output;
  const totalCost = inputCost + cachedCost + outputCost;

  return { inputCost, cachedCost, outputCost, totalCost };
}

// ✅ Save token usage to Supabase (increment or insert)
async function logUsage(user_id: string, newTokens: number) {
  const { data: existing, error: fetchError } = await supabase
    .from("resume_data_logs")
    .select("usage")
    .eq("id", user_id)
    .single();

  if (fetchError && fetchError.code !== "PGRST116") {
    console.error("❌ Error fetching usage:", fetchError.message);
    throw fetchError;
  }

  if (existing) {
    const updatedUsage = (existing.usage || 0) + newTokens;

    const { error: updateError } = await supabase
      .from("resume_data_logs")
      .update({
        usage: updatedUsage,
        time: new Date().toISOString(),
      })
      .eq("id", user_id);

    if (updateError) {
      console.error("❌ Error updating usage:", updateError.message);
      throw updateError;
    }
    // console.log(`✅ Usage incremented to ${updatedUsage}`);
  } else {
    const { error: insertError } = await supabase.from("resume_data_logs").insert({
      id: user_id,
      usage: newTokens,
      time: new Date().toISOString(),
    });

    if (insertError) {
      console.error("❌ Error inserting usage:", insertError.message);
      throw insertError;
    }
    // console.log(`✅ Usage inserted with ${newTokens}`);
  }
}

export async function POST(req: Request) {
  try {
    const { resumeData,jobData, score, session } = await req.json();
    const uuid = session?.user?.id;

    if (!resumeData || typeof resumeData !== "object") {
      return NextResponse.json(
        { error: "Missing or invalid resumeData" },
        { status: 400 }
      );
    }
    if (!jobData || typeof jobData !== "object"){
         return NextResponse.json(
            { error: "Missing or invalid jobData" },
            { status: 400 }
        );
    }
    if (!score || typeof score !== "number" || score < 0 || score > 1){
        return NextResponse.json(
            { error: "Score must be between 0 and 1" }, 
            { status: 400 }
        );
    } 

    const prompt = `
    You are an expert talent matching and recruitment analyst.

    Given the following inputs:

    Candidate Resume:
    """
    ${JSON.stringify(resumeData, null, 2)}
    """

    Company Job Requirements:
    """
    ${JSON.stringify(jobData, null, 2)}
    """

    Matching Score (between 0 and 1):
    ${score}

    ---

    Task:
    Analyze the resume against the company’s job requirements and provide a justification that logically supports the provided matching score.

    Your response must be returned ONLY in valid JSON format as shown below — no extra text, explanation, or markdown formatting.

    Output Format (JSON only):
    {
    "summary": "",
    "Job Profile Match": "",
    "Experience Level": "",
    "skillset alignment": "",
    "Location and company requirement fit": "",
    "End Line": ""
    }

    ---

    Instructions:
    - Each field must provide a professional, evidence-based explanation aligned with the provided resume, job requirements, and the score.
    - The tone should be analytical and objective, as if addressing a hiring manager.
    - Ensure the explanation reflects the given score (e.g., a 0.9 indicates a very strong match; 0.5 indicates moderate match; 0.2 indicates weak match).
    - The "End Line" should summarize why the score is appropriate (e.g., "Overall, the candidate achieves a 0.85 match due to close alignment in experience and skills.").
    - Do NOT include any additional commentary, code fences, or markdown — only valid JSON.
    `;


    const model = "gpt-5-mini";

    const completion = await openai.chat.completions.create({
      model,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = completion.choices[0]?.message?.content?.trim() || "{}";
    // console.log("🔍 Raw OpenAI output:", raw);

    // Extract JSON
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: "No JSON object found", raw },
        { status: 500 }
      );
    }

    let parsed;
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch (err) {
      console.error("❌ JSON parse error:", err);
      return NextResponse.json(
        { error: "Invalid JSON format", raw },
        { status: 500 }
      );
    }

    // ✅ Track usage + cost
    const usage = completion.usage ?? null;
    const cost = calculateCost(model, usage);
    await logUsage(uuid, usage?.total_tokens ?? 0);

    return NextResponse.json({
      ...parsed, 
      usage,
      cost,
    });
  } catch (err) {
    console.error("Insight generation error:", err);
    return NextResponse.json(
      { error: "Failed to generate Insight", details: String(err) },
      { status: 500 }
    );
  }
}