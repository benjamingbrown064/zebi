# Storage Setup for File Attachments

## Supabase Storage Configuration

To enable file attachments, you need to:

1. **Create Storage Bucket in Supabase Dashboard:**
   - Go to Supabase project: https://supabase.com/dashboard
   - Navigate to Storage > Buckets
   - Create a new bucket named: `task-attachments`
   - Set it as **private** (not public)
   - Configure:
     - Max file size: 10MB
     - Allowed MIME types:
       - `image/jpeg`
       - `image/png`
       - `application/pdf`
       - `application/vnd.openxmlformats-officedocument.wordprocessingml.document`

2. **Add Service Role Key to .env.local:**
   ```
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   ```
   Get this from: Supabase Dashboard > Settings > API > service_role key

3. **Set Storage Policies (Optional):**
   If you want to add RLS policies, go to Storage > Policies and configure access rules.

## Testing File Uploads

Once configured, you can:
- Upload files via the task detail modal
- Drag & drop files onto the upload area
- Download attachments from the attachments list
- Delete attachments

## Supported File Types

- Images: .jpg, .jpeg, .png
- Documents: .pdf, .docx
- Max size: 10MB per file
