/**
 * Test script: Upload Rider PDF and verify task creation
 * 
 * Usage: npx tsx scripts/test-rider-upload.ts
 * 
 * Requires:
 * - Dev server running (npm run dev)
 * - LM Studio running with a model loaded
 * - RIDER_.VRIL 2026.pdf in project root
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const API_URL = process.env.API_URL || 'http://localhost:3000';
const TEST_ARTIST_ID = '28d01ca3-e887-463f-82a3-c584627c9b2f'; // .VRIL
const TEST_PDF_PATH = join(process.cwd(), 'RIDER_.VRIL 2026.pdf');

interface Task {
  id: string;
  title: string;
  status: string;
}

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP ${response.status}: ${text}`);
  }
  return response.json();
}

async function deleteAllTasks(): Promise<number> {
  const { tasks } = await fetchJson<{ tasks: Task[] }>(`${API_URL}/api/tasks`);
  let deleted = 0;
  
  for (const task of tasks) {
    await fetch(`${API_URL}/api/tasks/${task.id}`, { method: 'DELETE' });
    deleted++;
  }
  
  return deleted;
}

async function getAllTasks(): Promise<Task[]> {
  const { tasks } = await fetchJson<{ tasks: Task[] }>(`${API_URL}/api/tasks`);
  return tasks;
}

async function uploadRiderPdf(): Promise<{
  success: boolean;
  tasks_created: number;
  warnings: string[];
  task_events: Array<{ event_name: string; event_date: string; tasks_created: number; task_titles: string[] }>;
}> {
  const pdfBuffer = readFileSync(TEST_PDF_PATH);
  const formData = new FormData();
  formData.append('file', new Blob([pdfBuffer], { type: 'application/pdf' }), 'RIDER_.VRIL 2026.pdf');
  formData.append('artist_id', TEST_ARTIST_ID);
  formData.append('rider_type', 'both');

  return fetchJson(`${API_URL}/api/artists/extract-rider`, {
    method: 'POST',
    body: formData,
  });
}

async function main() {
  console.log('=== Rider Upload Test ===\n');

  // Step 1: Reset
  console.log('1. Deleting all tasks...');
  const deleted = await deleteAllTasks();
  console.log(`   Deleted ${deleted} tasks\n`);

  // Step 2: Verify clean state
  console.log('2. Verifying clean state...');
  const beforeTasks = await getAllTasks();
  if (beforeTasks.length > 0) {
    console.error(`   FAIL: ${beforeTasks.length} tasks still exist`);
    process.exit(1);
  }
  console.log('   PASS: No tasks in database\n');

  // Step 3: Upload PDF
  console.log('3. Uploading RIDER_.VRIL 2026.pdf...');
  console.log('   (This takes 1-5 minutes - AI is processing...)');
  const startTime = Date.now();
  
  try {
    const result = await uploadRiderPdf();
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`   Completed in ${elapsed}s`);
    console.log(`   Tasks created: ${result.tasks_created}`);
    
    if (result.warnings.length > 0) {
      console.log(`   Warnings: ${result.warnings.join(', ')}`);
    }
    
    if (result.task_events.length > 0) {
      console.log('\n   Task events:');
      for (const event of result.task_events) {
        console.log(`   - ${event.event_name} (${event.event_date}): ${event.tasks_created} tasks`);
        for (const title of event.task_titles) {
          console.log(`     • ${title}`);
        }
      }
    }
  } catch (error) {
    console.error('   FAIL: Upload failed:', error);
    process.exit(1);
  }

  // Step 4: Verify tasks created
  console.log('\n4. Verifying tasks...');
  const afterTasks = await getAllTasks();
  
  if (afterTasks.length === 0) {
    console.error('   FAIL: No tasks created');
    process.exit(1);
  }
  
  console.log(`   Total tasks: ${afterTasks.length}\n`);
  
  // Group by status
  const byStatus: Record<string, Task[]> = {};
  for (const task of afterTasks) {
    if (!byStatus[task.status]) byStatus[task.status] = [];
    byStatus[task.status].push(task);
  }
  
  console.log('   Tasks by status:');
  for (const [status, tasks] of Object.entries(byStatus)) {
    console.log(`   ${status}: ${tasks.length}`);
    for (const task of tasks) {
      console.log(`     • ${task.title}`);
    }
  }

  // Step 5: Check for needs_refining tasks
  console.log('\n5. Checking needs_refining tasks...');
  const needsRefining = byStatus['needs_refining'] || [];
  const todo = byStatus['todo'] || [];
  
  if (needsRefining.length > 0) {
    console.log(`   PASS: ${needsRefining.length} tasks in "Needs Refining"`);
  } else {
    console.log('   WARN: No tasks in "Needs Refining" column');
    console.log('   This is OK if all tasks have specific time/party assigned');
  }

  console.log('\n=== Test Complete ===');
  console.log(`Total: ${afterTasks.length} tasks created`);
  console.log(`Needs Refining: ${needsRefining.length}`);
  console.log(`To Do: ${todo.length}`);
}

main().catch(console.error);
