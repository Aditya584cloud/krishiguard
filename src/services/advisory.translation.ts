type AdvisoryLanguage = "English" | "Odia" | "Hindi";

type AdvisoryContext = {
  crop: string;
  temperatureC: number;
  humidityPercent: number;
  rainMm: number;
};

const advisoryMessages: Record<
  AdvisoryLanguage,
  {
    heavyRain: (crop: string) => string;
    highTemperature: (crop: string) => string;
    highHumidity: (crop: string) => string;
    normal: (crop: string) => string;
  }
> = {
  English: {
    heavyRain: (crop) =>
      `Heavy rainfall is expected. Avoid unnecessary irrigation in your ${crop} field and make sure excess water can drain properly. Check the crop after the rain for waterlogging.`,

    highTemperature: (crop) =>
      `Temperature is high today. Check your ${crop} field for signs of water stress. If the soil is dry, irrigate when necessary, preferably during cooler hours.`,

    highHumidity: (crop) =>
      `Humidity is high, which can increase the risk of fungal disease in your ${crop} crop. Check the leaves regularly for spots or other unusual symptoms.`,

    normal: (crop) =>
      `Current weather conditions are generally suitable for your ${crop} crop. Continue regular field monitoring and follow your normal crop-care practices.`,
  },

  Odia: {
    heavyRain: (crop) =>
      `ପ୍ରବଳ ବର୍ଷା ହେବାର ସମ୍ଭାବନା ଅଛି। ଆପଣଙ୍କ ${crop} ଜମିରେ ଆବଶ୍ୟକ ନଥିଲେ ପାଣି ଦିଅନ୍ତୁ ନାହିଁ ଏବଂ ଅତିରିକ୍ତ ପାଣି ବାହାରିଯିବାର ବ୍ୟବସ୍ଥା କରନ୍ତୁ। ବର୍ଷା ପରେ ଜମିରେ ପାଣି ଜମିଛି କି ନାହିଁ ଯାଞ୍ଚ କରନ୍ତୁ।`,

    highTemperature: (crop) =>
      `ଆଜି ତାପମାତ୍ରା ଅଧିକ ରହିବ। ଆପଣଙ୍କ ${crop} ଫସଲରେ ପାଣିର ଅଭାବର ଲକ୍ଷଣ ଦେଖନ୍ତୁ। ମାଟି ଶୁଖିଲା ଥିଲେ ଆବଶ୍ୟକ ଅନୁସାରେ ପାଣି ଦିଅନ୍ତୁ, ସମ୍ଭବ ହେଲେ ଥଣ୍ଡା ସମୟରେ।`,

    highHumidity: (crop) =>
      `ବାୟୁରେ ଆର୍ଦ୍ରତା ଅଧିକ ଅଛି। ଏହା ଆପଣଙ୍କ ${crop} ଫସଲରେ ଛତୁଆ ରୋଗର ଆଶଙ୍କା ବଢ଼ାଇପାରେ। ପତ୍ରରେ ଦାଗ କିମ୍ବା ଅସ୍ୱାଭାବିକ ଲକ୍ଷଣ ଅଛି କି ନିୟମିତ ଯାଞ୍ଚ କରନ୍ତୁ।`,

    normal: (crop) =>
      `ବର୍ତ୍ତମାନର ପାଣିପାଗ ଆପଣଙ୍କ ${crop} ଫସଲ ପାଇଁ ସାଧାରଣତଃ ଉପଯୁକ୍ତ। ଜମିକୁ ନିୟମିତ ଯାଞ୍ଚ କରନ୍ତୁ ଏବଂ ଫସଲର ସାଧାରଣ ଯତ୍ନ ଜାରି ରଖନ୍ତୁ।`,
  },

  Hindi: {
    heavyRain: (crop) =>
      `भारी बारिश होने की संभावना है। अपनी ${crop} की फसल में अनावश्यक सिंचाई न करें और खेत से अतिरिक्त पानी निकलने की व्यवस्था रखें। बारिश के बाद खेत में पानी जमा है या नहीं, इसकी जांच करें।`,

    highTemperature: (crop) =>
      `आज तापमान अधिक रहेगा। अपनी ${crop} की फसल में पानी की कमी के लक्षण देखें। मिट्टी सूखी होने पर जरूरत के अनुसार सिंचाई करें, संभव हो तो ठंडे समय में।`,

    highHumidity: (crop) =>
      `हवा में नमी अधिक है। इससे आपकी ${crop} की फसल में फंगल रोग का खतरा बढ़ सकता है। पत्तियों पर धब्बे या अन्य असामान्य लक्षणों की नियमित जांच करें।`,

    normal: (crop) =>
      `वर्तमान मौसम आपकी ${crop} की फसल के लिए सामान्यतः अनुकूल है। खेत की नियमित निगरानी करें और फसल की सामान्य देखभाल जारी रखें।`,
  },
};

export const generateFarmerAdvisory = (
  language: string,
  context: AdvisoryContext,
) => {
  const messages =
    advisoryMessages[language as AdvisoryLanguage] ??
    advisoryMessages.English;

  const recommendations: string[] = [];

  if (context.rainMm > 10) {
    recommendations.push(messages.heavyRain(context.crop));
  }

  if (context.temperatureC > 35) {
    recommendations.push(messages.highTemperature(context.crop));
  }

  if (context.humidityPercent > 80) {
    recommendations.push(messages.highHumidity(context.crop));
  }

  if (recommendations.length === 0) {
    recommendations.push(messages.normal(context.crop));
  }

  return recommendations;
};