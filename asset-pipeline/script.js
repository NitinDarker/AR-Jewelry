import fs from 'fs/promises'
import path from 'path'
import { removeBackground } from '@imgly/background-removal-node'
import sharp from 'sharp'

const INPUT_DIR = './input'
const OUTPUT_DIR = './output'

async function processAssets () {
  try {
    // Ensure directories exist
    await fs.mkdir(INPUT_DIR, { recursive: true })
    await fs.mkdir(OUTPUT_DIR, { recursive: true })

    const files = await fs.readdir(INPUT_DIR)
    const imageFiles = files.filter(file =>
      /\.(jpg|jpeg|png|webp)$/i.test(file)
    )

    if (imageFiles.length === 0) {
      console.log('No images found in the input directory. Exiting.')
      return
    }

    console.log(
      `Found ${imageFiles.length} images. Starting batch processing...`
    )

    for (const file of imageFiles) {
      const inputPath = path.join(INPUT_DIR, file)
      // Force the output to be a .png regardless of input type
      const outputFilename = `${path.parse(file).name}.png`
      const outputPath = path.join(OUTPUT_DIR, outputFilename)

      console.log(`\nProcessing: ${file}`)

      try {
        // 1. Remove Background
        console.log(`  -> Stripping background...`)
        const blob = await removeBackground(inputPath)

        // Convert Web Blob to Node Buffer
        const arrayBuffer = await blob.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        // 2. Crop Transparent Padding
        console.log(`  -> Trimming transparent padding...`)
        await sharp(buffer)
          .trim() // This is the magic method. It cuts away all empty pixels.
          .png() // Enforce PNG formatting
          .toFile(outputPath)

        console.log(`  -> Success: Saved to ${outputPath}`)
      } catch (err) {
        console.error(`  -> ERROR processing ${file}:`, err.message)
      }
    }

    console.log(
      '\nBatch processing complete. Move the output folder contents to your Vite public/assets directory.'
    )
  } catch (error) {
    console.error('Pipeline failure:', error)
  }
}

processAssets()
