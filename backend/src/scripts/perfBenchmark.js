const request = require('supertest');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const app = require('../app');
const User = require('../models/User');
const Workflow = require('../models/Workflow');
const Rule = require('../models/Rule');
const externalCreditService = require('../services/integrations/externalCreditService');
const { connectDB, disconnectDB } = require('../config/db');

async function runBenchmark() {
  console.log('Starting Resilient Decision System Performance Benchmark...');
  await connectDB();

  // Force external credit service to instantaneous success to isolate decision engine overhead
  externalCreditService.setChaosConfig({ forceMode: 'SUCCESS' });

  // Get or create test user and JWT token
  let user = await User.findOne({ username: 'perf_tester' });
  if (!user) {
    user = await User.create({
      username: 'perf_tester',
      email: 'perf@test.com',
      password: 'Password123!',
      fullName: 'Performance Tester',
      role: 'admin'
    });
  }

  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ usernameOrEmail: 'perf_tester', password: 'Password123!' });
  const token = loginRes.body.data.token;

  const CONCURRENCY_BATCHES = [50, 100];
  const results = {};

  for (const totalRequests of CONCURRENCY_BATCHES) {
    console.log(`\nExecuting benchmark for ${totalRequests} requests...`);
    const latencies = [];
    let successCount = 0;
    let failCount = 0;
    const startTime = Date.now();

    // Fire in parallel batches of 25
    const batchSize = 25;
    for (let i = 0; i < totalRequests; i += batchSize) {
      const currentBatchCount = Math.min(batchSize, totalRequests - i);
      const batchPromises = Array.from({ length: currentBatchCount }).map(async (_, idx) => {
        const reqIndex = i + idx;
        const reqStart = Date.now();
        try {
          const res = await request(app)
            .post('/api/requests')
            .set('Authorization', `Bearer ${token}`)
            .send({
              workflowCode: 'APPLICATION_APPROVAL',
              idempotencyKey: `PERF-KEY-${Date.now()}-${reqIndex}-${Math.random()}`,
              payload: {
                applicantName: `Perf Applicant ${reqIndex}`,
                amount: 25000 + (reqIndex % 5) * 5000,
                income: 75000,
                documents: { idProof: `DOC-${reqIndex}` }
              }
            });

          const duration = Date.now() - reqStart;
          latencies.push(duration);
          if (res.statusCode === 201 && res.body.success) {
            successCount++;
          } else {
            failCount++;
          }
        } catch (err) {
          latencies.push(Date.now() - reqStart);
          failCount++;
        }
      });

      await Promise.all(batchPromises);
    }

    const totalDurationMs = Date.now() - startTime;
    latencies.sort((a, b) => a - b);

    const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    const p50 = latencies[Math.floor(latencies.length * 0.5)];
    const p95 = latencies[Math.floor(latencies.length * 0.95)];
    const p99 = latencies[Math.floor(latencies.length * 0.99)];
    const rps = (totalRequests / (totalDurationMs / 1000)).toFixed(2);

    results[`${totalRequests}_requests`] = {
      totalRequests,
      successCount,
      failCount,
      successRate: `${((successCount / totalRequests) * 100).toFixed(1)}%`,
      totalDurationMs,
      avgLatencyMs: Math.round(avgLatency),
      p50Ms: p50,
      p95Ms: p95,
      p99Ms: p99,
      throughputRps: parseFloat(rps)
    };

    console.log(`Results for ${totalRequests} requests:`);
    console.log(`  Success Rate   : ${((successCount / totalRequests) * 100).toFixed(1)}%`);
    console.log(`  Total Time     : ${totalDurationMs} ms`);
    console.log(`  Avg Latency    : ${Math.round(avgLatency)} ms`);
    console.log(`  P95 Latency    : ${p95} ms`);
    console.log(`  Throughput     : ${rps} req/sec`);
  }

  const outPath = path.join(__dirname, '../../../docs/performance_results.json');
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
  console.log(`\nPerformance results saved to ${outPath}`);

  await disconnectDB();
  process.exit(0);
}

runBenchmark().catch((err) => {
  console.error('Benchmark error:', err);
  process.exit(1);
});
