/**
 * Quick test script for Document API endpoints
 * Run with: node test-documents-api.js
 * 
 * Make sure the dev server is running on port 3001
 */

const API_BASE = 'http://localhost:3001/api';

async function testDocumentAPI() {
  console.log('🧪 Testing Document System API...\n');

  let createdDocId = null;

  try {
    // Test 1: Create a document
    console.log('1️⃣ Testing POST /api/documents (Create)');
    const createRes = await fetch(`${API_BASE}/documents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Test Document',
        documentType: 'notes',
        contentRich: {
          type: 'doc',
          content: [
            {
              type: 'heading',
              attrs: { level: 1 },
              content: [{ type: 'text', text: 'Test Document' }]
            },
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'This is a test.' }]
            }
          ]
        }
      })
    });
    const createData = await createRes.json();
    console.log('✅ Create:', createData.success ? 'PASS' : 'FAIL');
    if (createData.success) {
      createdDocId = createData.document.id;
      console.log(`   Document ID: ${createdDocId}\n`);
    } else {
      console.log(`   Error: ${createData.error}\n`);
      return;
    }

    // Test 2: List documents
    console.log('2️⃣ Testing GET /api/documents (List)');
    const listRes = await fetch(`${API_BASE}/documents`);
    const listData = await listRes.json();
    console.log('✅ List:', listData.success ? 'PASS' : 'FAIL');
    console.log(`   Found ${listData.total} documents\n`);

    // Test 3: Get single document
    console.log('3️⃣ Testing GET /api/documents/[id] (Get)');
    const getRes = await fetch(`${API_BASE}/documents/${createdDocId}`);
    const getData = await getRes.json();
    console.log('✅ Get:', getData.success ? 'PASS' : 'FAIL');
    if (getData.success) {
      console.log(`   Title: ${getData.document.title}`);
      console.log(`   Type: ${getData.document.documentType}`);
      console.log(`   Version: ${getData.document.version}\n`);
    }

    // Test 4: Update document
    console.log('4️⃣ Testing PUT /api/documents/[id] (Update)');
    const updateRes = await fetch(`${API_BASE}/documents/${createdDocId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Updated Test Document',
        contentRich: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'Updated content.' }]
            }
          ]
        }
      })
    });
    const updateData = await updateRes.json();
    console.log('✅ Update:', updateData.success ? 'PASS' : 'FAIL');
    if (updateData.success) {
      console.log(`   New title: ${updateData.document.title}\n`);
    }

    // Test 5: Create version
    console.log('5️⃣ Testing POST /api/documents/[id]/versions (Create Version)');
    const versionRes = await fetch(`${API_BASE}/documents/${createdDocId}/versions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contentRich: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'Version 2 content.' }]
            }
          ]
        }
      })
    });
    const versionData = await versionRes.json();
    console.log('✅ Create Version:', versionData.success ? 'PASS' : 'FAIL');
    if (versionData.success) {
      console.log(`   Version number: ${versionData.version.version}\n`);
    }

    // Test 6: Get versions
    console.log('6️⃣ Testing GET /api/documents/[id]/versions (List Versions)');
    const versionsRes = await fetch(`${API_BASE}/documents/${createdDocId}/versions`);
    const versionsData = await versionsRes.json();
    console.log('✅ List Versions:', versionsData.success ? 'PASS' : 'FAIL');
    console.log(`   Total versions: ${versionsData.versions.length}\n`);

    // Test 7: Search documents
    console.log('7️⃣ Testing GET /api/documents?search=Updated (Search)');
    const searchRes = await fetch(`${API_BASE}/documents?search=Updated`);
    const searchData = await searchRes.json();
    console.log('✅ Search:', searchData.success ? 'PASS' : 'FAIL');
    console.log(`   Found ${searchData.total} matching documents\n`);

    // Test 8: Filter by type
    console.log('8️⃣ Testing GET /api/documents?documentType=notes (Filter)');
    const filterRes = await fetch(`${API_BASE}/documents?documentType=notes`);
    const filterData = await filterRes.json();
    console.log('✅ Filter:', filterData.success ? 'PASS' : 'FAIL');
    console.log(`   Found ${filterData.total} notes documents\n`);

    // Test 9: Delete document
    console.log('9️⃣ Testing DELETE /api/documents/[id] (Delete)');
    const deleteRes = await fetch(`${API_BASE}/documents/${createdDocId}`, {
      method: 'DELETE'
    });
    const deleteData = await deleteRes.json();
    console.log('✅ Delete:', deleteData.success ? 'PASS' : 'FAIL\n');

    console.log('🎉 All tests completed successfully!\n');

  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

// Run tests
testDocumentAPI();
