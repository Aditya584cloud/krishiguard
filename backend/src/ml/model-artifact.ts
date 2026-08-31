

export const MODEL_ARTIFACT = {
  "modelType": "logistic-regression",
  "trainedAt": "2026-08-30T13:26:15.068Z",
  "featureOrder": [
    "rainfallDroughtSeverity",
    "priceCrashSeverity",
    "loanUrgency"
  ],
  "weights": {
    "rainfallDroughtSeverity": 2.6793,
    "priceCrashSeverity": 2.2362,
    "loanUrgency": 1.5873
  },
  "bias": -2.3108,
  "riskLevelThresholds": {
    "low": 0.33,
    "high": 0.66
  },
  "training": {
    "dataSource": "SYNTHETIC_DEMO",
    "datasetSize": 4000,
    "trainSize": 3200,
    "testSize": 800,
    "epochs": 3000
  },
  "evaluation": {
    "accuracy": 0.7825,
    "precision": 0.6038,
    "recall": 0.173,
    "f1": 0.2689
  }
} as const;
