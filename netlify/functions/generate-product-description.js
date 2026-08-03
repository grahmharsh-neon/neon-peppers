const OPENAI_ENDPOINT = "https://api.openai.com/v1/responses";

function json(statusCode, body){
  return {
    statusCode,
    headers:{
      "Content-Type":"application/json",
      "Cache-Control":"no-store"
    },
    body:JSON.stringify(body)
  };
}

function clean(value, maxLength){
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function extractOutputText(data){
  if(typeof data?.output_text === "string" && data.output_text.trim()){
    return data.output_text.trim();
  }

  const output = Array.isArray(data?.output) ? data.output : [];

  for(const item of output){
    const content = Array.isArray(item?.content) ? item.content : [];

    for(const part of content){
      if(typeof part?.text === "string" && part.text.trim()){
        return part.text.trim();
      }
    }
  }

  return "";
}

exports.handler = async function(event){
  if(event.httpMethod !== "POST"){
    return json(405, { error:"Method not allowed." });
  }

  try{
    const apiKey = process.env.OPENAI_API_KEY;
    const model = process.env.OPENAI_MODEL || "gpt-5-mini";

    if(!apiKey){
      return json(500, {
        error:
          "OPENAI_API_KEY is missing from Netlify environment variables."
      });
    }

    const body = JSON.parse(event.body || "{}");

    const name = clean(body.name, 120);
    const strength = clean(body.strength, 80);
    const category = clean(body.category, 100);
    const existingDescription = clean(
      body.existing_description,
      2500
    );

    if(!name){
      return json(400, {
        error:"A product name is required."
      });
    }

    const systemPrompt = `
You write concise product-catalog copy for a laboratory research-material website.

The output must:
- Be neutral, factual, and cautious.
- Describe research context only.
- Never give dosing, administration, reconstitution, cycling, treatment, medical, veterinary, or personal-use instructions.
- Never promise benefits, outcomes, safety, purity, legality, or effectiveness.
- Never call a product approved unless that fact is supplied.
- Avoid sales hype and unsupported claims.
- Clearly say the material is for laboratory research use only and is not intended for human or veterinary use.
- Use plain language that is easy to scan.
- Do not include citations or URLs.
- Do not mention that AI generated the text.

Return JSON matching the provided schema.
`.trim();

    const userPrompt = `
Create a product description for this catalog entry.

Product name: ${name}
Strength: ${strength || "Not provided"}
Category: ${category || "Not provided"}
Existing description for context: ${existingDescription || "None"}

Create:
1. A short card summary of no more than 24 words.
2. A structured full description written in clean Markdown.

Use this exact general structure:

## Research Focus

One short paragraph.

## Common Research Areas

- Two to four concise bullet points

## Product Information

- Include the supplied strength only when one was provided
- Include only facts supplied in the request

## Research Use Only

One short disclaimer paragraph.

Formatting rules:
- Use Markdown headings beginning with ##.
- Put each bullet on its own line beginning with "- ".
- Keep paragraphs short.
- Do not place multiple bullet points on one line.
- Do not use tables.
- Do not invent a format, purity, batch, testing result, storage condition, or mechanism that was not provided.
`.trim();

    const requestBody = {
      model,
      input:[
        {
          role:"system",
          content:[
            {
              type:"input_text",
              text:systemPrompt
            }
          ]
        },
        {
          role:"user",
          content:[
            {
              type:"input_text",
              text:userPrompt
            }
          ]
        }
      ],
      text:{
        format:{
          type:"json_schema",
          name:"product_description",
          strict:true,
          schema:{
            type:"object",
            additionalProperties:false,
            properties:{
              card_summary:{
                type:"string"
              },
              full_description:{
                type:"string"
              }
            },
            required:[
              "card_summary",
              "full_description"
            ]
          }
        }
      }
    };

    const openAIResponse = await fetch(OPENAI_ENDPOINT, {
      method:"POST",
      headers:{
        "Authorization":`Bearer ${apiKey}`,
        "Content-Type":"application/json"
      },
      body:JSON.stringify(requestBody)
    });

    const responseData = await openAIResponse.json()
      .catch(() => ({}));

    if(!openAIResponse.ok){
      console.error("OpenAI API error:", responseData);

      const apiMessage =
        responseData?.error?.message ||
        "The AI service returned an error.";

      return json(openAIResponse.status, {
        error:apiMessage
      });
    }

    const outputText = extractOutputText(responseData);

    if(!outputText){
      console.error("No output text:", responseData);

      return json(502, {
        error:"The AI service returned no description."
      });
    }

    let generated;

    try{
      generated = JSON.parse(outputText);
    }catch(error){
      console.error("Could not parse AI JSON:", outputText);

      return json(502, {
        error:"The generated description could not be read."
      });
    }

    const cardSummary = clean(generated.card_summary, 300);
    const fullDescription = String(
      generated.full_description || ""
    ).trim().slice(0, 5000);

    if(!fullDescription){
      return json(502, {
        error:"The generated description was empty."
      });
    }

    const combinedDescription =
      `${cardSummary}\n\n${fullDescription}`.trim();

    return json(200, {
      description:combinedDescription,
      card_summary:cardSummary,
      full_description:fullDescription,
      model
    });
  }catch(error){
    console.error("Generator failure:", error);

    return json(500, {
      error:
        error.message ||
        "The product description could not be generated."
    });
  }
};
