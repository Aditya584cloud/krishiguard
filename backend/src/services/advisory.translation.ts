export type AdvisoryLanguage = "English" | "Odia" | "Hindi";

export type SoilRetention = "low" | "medium" | "high";

const SOIL_RETENTION: Record<string, SoilRetention> = {
  Sandy: "low",
  Laterite: "low",
  Red: "low",
  Alluvial: "medium",
  Loamy: "medium",
  Black: "high",
  Clay: "high",
};

export function getSoilRetention(soilType: string): SoilRetention {
  return SOIL_RETENTION[soilType] ?? "medium";
}

type MessageFn = (crop: string) => string;

interface AdvisoryMessages {
  heavyRainWaterlogging: MessageFn;
  heavyRainStandard: MessageFn;
  highTempLowRetention: MessageFn;
  highTempStandard: MessageFn;
  highHumidity: MessageFn;
  irrigationTipLowRetention: MessageFn;
  irrigationTipHighRetention: MessageFn;
  normal: MessageFn;
}

const advisoryMessages: Record<AdvisoryLanguage, AdvisoryMessages> = {
  English: {
    heavyRainWaterlogging: (crop) =>
      `Heavy rainfall is expected, and your soil retains water strongly, so waterlogging is a real risk for your ${crop} field. Clear drainage channels now and avoid heavy machinery on wet soil until it firms up.`,
    heavyRainStandard: (crop) =>
      `Heavy rainfall is expected. Avoid unnecessary irrigation in your ${crop} field and make sure excess water can drain properly. Check the crop after the rain for waterlogging.`,
    highTempLowRetention: (crop) =>
      `Temperature is high today, and your soil drains quickly and dries out fast. Irrigate your ${crop} field more frequently with lighter amounts, preferably during cooler hours, and consider mulching to reduce moisture loss.`,
    highTempStandard: (crop) =>
      `Temperature is high today. Check your ${crop} field for signs of water stress. If the soil is dry, irrigate when necessary, preferably during cooler hours.`,
    highHumidity: (crop) =>
      `Humidity is high, which can increase the risk of fungal disease in your ${crop} crop. Check the leaves regularly for spots or other unusual symptoms.`,
    irrigationTipLowRetention: (crop) =>
      `Your soil drains quickly and does not hold moisture for long. Plan more frequent, lighter irrigation for your ${crop} crop and consider mulching to conserve soil moisture.`,
    irrigationTipHighRetention: (crop) =>
      `Your soil retains moisture well. Space out irrigation for your ${crop} crop and avoid overwatering, which can lead to root stress in retentive soil.`,
    normal: (crop) =>
      `Current weather conditions are generally suitable for your ${crop} crop. Continue regular field monitoring and follow your normal crop-care practices.`,
  },

  Odia: {
    heavyRainWaterlogging: (crop) =>
      `ପ୍ରବଳ ବର୍ଷା ହେବାର ସମ୍ଭାବନା ଅଛି, ଏବଂ ଆପଣଙ୍କ ମାଟି ପାଣି ଅଧିକ ଧରି ରଖେ, ତେଣୁ ଆପଣଙ୍କ ${crop} ଜମିରେ ପାଣି ଜମିବାର ପ୍ରକୃତ ଆଶଙ୍କା ଅଛି। ବର୍ତ୍ତମାନ ନିଷ୍କାସନ ନାଳ ସଫା କରନ୍ତୁ ଏବଂ ମାଟି ଶକ୍ତ ନହେବା ପର୍ଯ୍ୟନ୍ତ ଓଦା ମାଟିରେ ଭାରି ଯନ୍ତ୍ରପାତି ବ୍ୟବହାର କରନ୍ତୁ ନାହିଁ।`,
    heavyRainStandard: (crop) =>
      `ପ୍ରବଳ ବର୍ଷା ହେବାର ସମ୍ଭାବନା ଅଛି। ଆପଣଙ୍କ ${crop} ଜମିରେ ଆବଶ୍ୟକ ନଥିଲେ ପାଣି ଦିଅନ୍ତୁ ନାହିଁ ଏବଂ ଅତିରିକ୍ତ ପାଣି ବାହାରିଯିବାର ବ୍ୟବସ୍ଥା କରନ୍ତୁ। ବର୍ଷା ପରେ ଜମିରେ ପାଣି ଜମିଛି କି ନାହିଁ ଯାଞ୍ଚ କରନ୍ତୁ।`,
    highTempLowRetention: (crop) =>
      `ଆଜି ତାପମାତ୍ରା ଅଧିକ ଅଛି, ଏବଂ ଆପଣଙ୍କ ମାଟି ଶୀଘ୍ର ଶୁଖିଯାଏ। ଆପଣଙ୍କ ${crop} ଫସଲରେ ଅଳ୍ପ ଅଳ୍ପ କରି ଅଧିକ ଥର ପାଣି ଦିଅନ୍ତୁ, ସମ୍ଭବ ହେଲେ ଥଣ୍ଡା ସମୟରେ, ଏବଂ ମାଟିରେ ମଲଚିଂ କରନ୍ତୁ।`,
    highTempStandard: (crop) =>
      `ଆଜି ତାପମାତ୍ରା ଅଧିକ ରହିବ। ଆପଣଙ୍କ ${crop} ଫସଲରେ ପାଣିର ଅଭାବର ଲକ୍ଷଣ ଦେଖନ୍ତୁ। ମାଟି ଶୁଖିଲା ଥିଲେ ଆବଶ୍ୟକ ଅନୁସାରେ ପାଣି ଦିଅନ୍ତୁ, ସମ୍ଭବ ହେଲେ ଥଣ୍ଡା ସମୟରେ।`,
    highHumidity: (crop) =>
      `ବାୟୁରେ ଆର୍ଦ୍ରତା ଅଧିକ ଅଛି। ଏହା ଆପଣଙ୍କ ${crop} ଫସଲରେ ଛତୁଆ ରୋଗର ଆଶଙ୍କା ବଢ଼ାଇପାରେ। ପତ୍ରରେ ଦାଗ କିମ୍ବା ଅସ୍ୱାଭାବିକ ଲକ୍ଷଣ ଅଛି କି ନିୟମିତ ଯାଞ୍ଚ କରନ୍ତୁ।`,
    irrigationTipLowRetention: (crop) =>
      `ଆପଣଙ୍କ ମାଟି ଶୀଘ୍ର ପାଣି ଛାଡ଼ିଦିଏ ଏବଂ ଅଧିକ ସମୟ ପାଣି ଧରି ରଖେ ନାହିଁ। ଆପଣଙ୍କ ${crop} ଫସଲ ପାଇଁ ଅଧିକ ଥର, ଅଳ୍ପ ପରିମାଣରେ ପାଣି ଦେବାର ଯୋଜନା କରନ୍ତୁ ଏବଂ ମଲଚିଂ ବ୍ୟବହାର କରନ୍ତୁ।`,
    irrigationTipHighRetention: (crop) =>
      `ଆପଣଙ୍କ ମାଟି ପାଣି ଭଲ ଭାବରେ ଧରି ରଖେ। ଆପଣଙ୍କ ${crop} ଫସଲ ପାଇଁ ପାଣି ଦେବାର ବ୍ୟବଧାନ ବଢ଼ାନ୍ତୁ ଏବଂ ଅଧିକ ପାଣି ଦେବାରୁ ଦୂରେଇ ରୁହନ୍ତୁ।`,
    normal: (crop) =>
      `ବର୍ତ୍ତମାନର ପାଣିପାଗ ଆପଣଙ୍କ ${crop} ଫସଲ ପାଇଁ ସାଧାରଣତଃ ଉପଯୁକ୍ତ। ଜମିକୁ ନିୟମିତ ଯାଞ୍ଚ କରନ୍ତୁ ଏବଂ ଫସଲର ସାଧାରଣ ଯତ୍ନ ଜାରି ରଖନ୍ତୁ।`,
  },

  Hindi: {
    heavyRainWaterlogging: (crop) =>
      `भारी बारिश होने की संभावना है, और आपकी मिट्टी पानी ज़्यादा रोक कर रखती है, इसलिए आपकी ${crop} की फसल में जलभराव का वास्तविक खतरा है। अभी जल निकासी नालियों को साफ करें और मिट्टी सख्त होने तक भारी मशीनरी का उपयोग न करें।`,
    heavyRainStandard: (crop) =>
      `भारी बारिश होने की संभावना है। अपनी ${crop} की फसल में अनावश्यक सिंचाई न करें और खेत से अतिरिक्त पानी निकलने की व्यवस्था रखें। बारिश के बाद खेत में पानी जमा है या नहीं, इसकी जांच करें।`,
    highTempLowRetention: (crop) =>
      `आज तापमान अधिक रहेगा, और आपकी मिट्टी जल्दी सूख जाती है। अपनी ${crop} की फसल में थोड़ी-थोड़ी मात्रा में लेकिन अधिक बार सिंचाई करें, संभव हो तो ठंडे समय में, और मल्चिंग करें।`,
    highTempStandard: (crop) =>
      `आज तापमान अधिक रहेगा। अपनी ${crop} की फसल में पानी की कमी के लक्षण देखें। मिट्टी सूखी होने पर जरूरत के अनुसार सिंचाई करें, संभव हो तो ठंडे समय में।`,
    highHumidity: (crop) =>
      `हवा में नमी अधिक है। इससे आपकी ${crop} की फसल में फंगल रोग का खतरा बढ़ सकता है। पत्तियों पर धब्बे या अन्य असामान्य लक्षणों की नियमित जांच करें।`,
    irrigationTipLowRetention: (crop) =>
      `आपकी मिट्टी जल्दी पानी छोड़ देती है और अधिक समय तक नमी नहीं रोकती। अपनी ${crop} की फसल के लिए बार-बार, कम मात्रा में सिंचाई की योजना बनाएं और मल्चिंग का उपयोग करें।`,
    irrigationTipHighRetention: (crop) =>
      `आपकी मिट्टी नमी अच्छी तरह रोक कर रखती है। अपनी ${crop} की फसल के लिए सिंचाई के बीच अंतराल बढ़ाएं और अधिक पानी देने से बचें।`,
    normal: (crop) =>
      `वर्तमान मौसम आपकी ${crop} की फसल के लिए सामान्यतः अनुकूल है। खेत की नियमित निगरानी करें और फसल की सामान्य देखभाल जारी रखें।`,
  },
};

type AdvisoryContext = {
  crop: string;
  soilType: string;
  temperatureC: number;
  humidityPercent: number;
  rainMm: number;
};

export const generateFarmerAdvisory = (
  language: string,
  context: AdvisoryContext,
) => {
  const messages =
    advisoryMessages[language as AdvisoryLanguage] ?? advisoryMessages.English;
  const retention = getSoilRetention(context.soilType);

  const recommendations: string[] = [];

  if (context.rainMm > 10) {
    recommendations.push(
      retention === "high"
        ? messages.heavyRainWaterlogging(context.crop)
        : messages.heavyRainStandard(context.crop),
    );
  }

  if (context.temperatureC > 35) {
    recommendations.push(
      retention === "low"
        ? messages.highTempLowRetention(context.crop)
        : messages.highTempStandard(context.crop),
    );
  }

  if (context.humidityPercent > 80) {
    recommendations.push(messages.highHumidity(context.crop));
  }

  if (recommendations.length === 0) {
    recommendations.push(messages.normal(context.crop));
    if (retention === "low") {
      recommendations.push(messages.irrigationTipLowRetention(context.crop));
    } else if (retention === "high") {
      recommendations.push(messages.irrigationTipHighRetention(context.crop));
    }
  }

  return recommendations;
};
