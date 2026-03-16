#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://btuphkievfekuwkfqnib.supabase.co';
const supabaseKey = 'sb_publishable_VJn6FPAW9bfgHxB6QMT7rA_jmOjM4Gw';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkBrandObjective() {
  // Find the objective
  const { data: objectives, error: objError } = await supabase
    .from('Objective')
    .select('*')
    .ilike('title', '%Brand positioned%');

  if (objError) {
    console.error('Error fetching objectives:', objError);
    return;
  }

  console.log('\n=== BRAND OBJECTIVE ===');
  console.log(JSON.stringify(objectives, null, 2));

  if (objectives && objectives.length > 0) {
    const objective = objectives[0];
    
    // Find tasks linked to this objective
    const { data: tasks, error: taskError } = await supabase
      .from('Task')
      .select('*')
      .eq('objectiveId', objective.id);

    if (taskError) {
      console.error('Error fetching tasks:', taskError);
      return;
    }

    console.log('\n=== TASKS FOR THIS OBJECTIVE ===');
    console.log(`Found ${tasks?.length || 0} tasks`);
    console.log(JSON.stringify(tasks, null, 2));
  }
}

checkBrandObjective().catch(console.error);
