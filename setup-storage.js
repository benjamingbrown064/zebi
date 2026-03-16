const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load .env.local manually
const envPath = path.join(__dirname, '.env.local')
const envContent = fs.readFileSync(envPath, 'utf8')
const env = {}
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=')
  if (key && valueParts.length) {
    env[key.trim()] = valueParts.join('=').trim()
  }
})

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
)

async function setupStorage() {
  try {
    console.log('Setting up Supabase Storage bucket...')

    // Check if bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets()
    
    if (listError) {
      console.error('Error listing buckets:', listError)
      return
    }

    const bucketExists = buckets.some(b => b.name === 'task-attachments')

    if (bucketExists) {
      console.log('✓ Bucket "task-attachments" already exists')
    } else {
      // Create bucket
      const { data, error } = await supabase.storage.createBucket('task-attachments', {
        public: false,
        fileSizeLimit: 10485760, // 10MB
        allowedMimeTypes: [
          'image/jpeg',
          'image/png',
          'application/pdf',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ]
      })

      if (error) {
        console.error('Error creating bucket:', error)
      } else {
        console.log('✓ Created bucket "task-attachments"')
      }
    }

    console.log('Storage setup complete!')
  } catch (err) {
    console.error('Setup error:', err)
  }
}

setupStorage()
