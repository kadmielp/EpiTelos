import fs from 'fs';
import path from 'path';

// Helper to convert snake_case or kebab-case to Title Case
const toTitleCase = (str) => {
  return str
    .replace(/[-_]/g, ' ')
    .replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
};

const functionsDir = path.join(process.cwd(), 'functions');
const publicDir = path.join(process.cwd(), 'public');
const outputFile = path.join(publicDir, 'built-in-functions.json');

const main = () => {
  try {
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }

    const builtInFunctions = [];
    // Ensure the directory exists before trying to read it
    if (!fs.existsSync(functionsDir)) {
      console.warn(`Functions directory not found at ${functionsDir}. Skipping manifest generation.`);
      // Still write an empty file to prevent 404 errors in the app
      fs.writeFileSync(outputFile, JSON.stringify([]));
      return;
    }

    const entries = fs.readdirSync(functionsDir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const functionId = entry.name;
        const systemMdPath = path.join(functionsDir, functionId, 'system.md');

        if (fs.existsSync(systemMdPath)) {
          const systemPrompt = fs.readFileSync(systemMdPath, 'utf-8');
          let functionName = toTitleCase(functionId);

          let description = undefined;
          let category = undefined;
          const metadataPath = path.join(functionsDir, functionId, 'metadata.json');
          if (fs.existsSync(metadataPath)) {
            try {
              const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
              // Use name from metadata if exists, otherwise title case the ID
              if (metadata.name) {
                functionName = metadata.name;
              }
              if (metadata.description) {
                description = metadata.description;
              }
              if (metadata.category) {
                category = metadata.category;
              }
            } catch (e) {
              console.warn(`Failed to parse metadata.json for ${functionId}:`, e);
            }
          }

          builtInFunctions.push({
            id: functionId,
            name: functionName,
            systemPrompt: systemPrompt,
            description: description,
            category: category,
            isCustom: false,
          });
        }
      }
    }

    // Sort functions alphabetically by name for a consistent order
    builtInFunctions.sort((a, b) => a.name.localeCompare(b.name));

    fs.writeFileSync(outputFile, JSON.stringify(builtInFunctions, null, 2));
    console.log(`✅ Successfully generated ${outputFile} with ${builtInFunctions.length} functions.`);

  } catch (error) {
    console.error('❌ Error generating built-in functions manifest:', error);
    process.exit(1);
  }
};

main();
