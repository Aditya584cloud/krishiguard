
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));


interface RawSample {
  rainfallDeviationPercent: number;
  priceChangePercent: number;
  loanProximityDays: number;
}

interface Features {
  rainfallDroughtSeverity: number; 
  priceCrashSeverity: number;
  loanUrgency: number;
}

function toFeatures(raw: RawSample): Features {
  return {
    rainfallDroughtSeverity:
      Math.min(100, Math.max(0, -raw.rainfallDeviationPercent)) / 100,
    priceCrashSeverity:
      Math.min(100, Math.max(0, -raw.priceChangePercent)) / 100,
    loanUrgency: Math.min(30, Math.max(0, 30 - raw.loanProximityDays)) / 30,
  };
}

function sigmoid(z: number): number {
  return 1 / (1 + Math.exp(-z));
}

const GROUND_TRUTH = { bias: -2.5, rain: 3.0, price: 2.5, loan: 2.0 };

function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(20260830);

function generateDataset(n: number) {
  const samples: { features: Features; label: number }[] = [];

  for (let i = 0; i < n; i++) {
    const raw: RawSample = {
      rainfallDeviationPercent: rand() * 140 - 70,
      priceChangePercent: rand() * 100 - 50,
      loanProximityDays: rand() < 0.25 ? 120 : rand() * 120,
    };

    const f = toFeatures(raw);
    const latent =
      GROUND_TRUTH.bias +
      GROUND_TRUTH.rain * f.rainfallDroughtSeverity +
      GROUND_TRUTH.price * f.priceCrashSeverity +
      GROUND_TRUTH.loan * f.loanUrgency;
    const pTrue = sigmoid(latent);
    const label = rand() < pTrue ? 1 : 0;

    samples.push({ features: f, label });
  }

  return samples;
}

function trainLogisticRegression(
  data: { features: Features; label: number }[],
  { epochs = 3000, learningRate = 0.5, l2 = 0.001 } = {},
) {
  let w = { rain: 0, price: 0, loan: 0 };
  let bias = 0;
  const n = data.length;

  for (let epoch = 0; epoch < epochs; epoch++) {
    let gradRain = 0;
    let gradPrice = 0;
    let gradLoan = 0;
    let gradBias = 0;

    for (const { features: f, label } of data) {
      const z =
        bias + w.rain * f.rainfallDroughtSeverity +
        w.price * f.priceCrashSeverity +
        w.loan * f.loanUrgency;
      const pred = sigmoid(z);
      const error = pred - label;

      gradRain += error * f.rainfallDroughtSeverity;
      gradPrice += error * f.priceCrashSeverity;
      gradLoan += error * f.loanUrgency;
      gradBias += error;
    }

    w = {
      rain: w.rain - learningRate * (gradRain / n + l2 * w.rain),
      price: w.price - learningRate * (gradPrice / n + l2 * w.price),
      loan: w.loan - learningRate * (gradLoan / n + l2 * w.loan),
    };
    bias = bias - learningRate * (gradBias / n);
  }

  return { weights: w, bias };
}

function predict(
  weights: { rain: number; price: number; loan: number },
  bias: number,
  f: Features,
): number {
  return sigmoid(
    bias +
      weights.rain * f.rainfallDroughtSeverity +
      weights.price * f.priceCrashSeverity +
      weights.loan * f.loanUrgency,
  );
}

const dataset = generateDataset(4000);

for (let i = dataset.length - 1; i > 0; i--) {
  const j = Math.floor(rand() * (i + 1));
  [dataset[i], dataset[j]] = [dataset[j]!, dataset[i]!];
}
const splitIndex = Math.floor(dataset.length * 0.8);
const trainSet = dataset.slice(0, splitIndex);
const testSet = dataset.slice(splitIndex);

const { weights, bias } = trainLogisticRegression(trainSet);

let tp = 0, fp = 0, tn = 0, fn = 0;
for (const { features, label } of testSet) {
  const p = predict(weights, bias, features);
  const predicted = p >= 0.5 ? 1 : 0;
  if (predicted === 1 && label === 1) tp++;
  else if (predicted === 1 && label === 0) fp++;
  else if (predicted === 0 && label === 0) tn++;
  else fn++;
}

const accuracy = (tp + tn) / testSet.length;
const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

const round4 = (n: number) => Math.round(n * 10000) / 10000;

const artifact = {
  modelType: "logistic-regression" as const,
  trainedAt: new Date().toISOString(),
  featureOrder: ["rainfallDroughtSeverity", "priceCrashSeverity", "loanUrgency"] as const,
  weights: {
    rainfallDroughtSeverity: round4(weights.rain),
    priceCrashSeverity: round4(weights.price),
    loanUrgency: round4(weights.loan),
  },
  bias: round4(bias),
  riskLevelThresholds: { low: 0.33, high: 0.66 },
  training: {
    dataSource: "SYNTHETIC_DEMO" as const,
    datasetSize: dataset.length,
    trainSize: trainSet.length,
    testSize: testSet.length,
    epochs: 3000,
  },
  evaluation: {
    accuracy: round4(accuracy),
    precision: round4(precision),
    recall: round4(recall),
    f1: round4(f1),
  },
};

const outPath = path.join(__dirname, "../src/ml/model-artifact.ts");
const fileContents = `// AUTO-GENERATED by scripts/train-risk-model.ts — do not hand edit.
// Regenerate with: npm run train:model
//
// TRAINING DATA IS SYNTHETIC (see the training script for the documented
// generative rule). Evaluation metrics below were measured on a held-out
// split of that synthetic dataset, not on real farmer outcomes.

export const MODEL_ARTIFACT = ${JSON.stringify(artifact, null, 2)} as const;
`;

writeFileSync(outPath, fileContents);

console.log(`Trained logistic regression on ${dataset.length} synthetic samples.`);
console.log(`Held-out test metrics: accuracy=${accuracy.toFixed(3)} precision=${precision.toFixed(3)} recall=${recall.toFixed(3)} f1=${f1.toFixed(3)}`);
console.log(`Weights: rain=${weights.rain.toFixed(3)} price=${weights.price.toFixed(3)} loan=${weights.loan.toFixed(3)} bias=${bias.toFixed(3)}`);
console.log(`Wrote ${outPath}`);
