export const serviceNames = {
  home: "Call Girls",
  repair: "Male Escorts",
  massage: "Massage",
} as const;

export const serviceCards = [
  {
    id: "call-girls",
    title: serviceNames.home,
    image: "/call_girls.jpeg",
    button: "Post Ad",
    description:
      "Premium escort services offering discreet, professional companionship. Book verified call girls for unforgettable experiences. Available 24/7 with complete privacy and satisfaction guaranteed. Contact now for elite adult entertainment tailored to your desires.",
  },
  {
    id: "male-escorts",
    title: serviceNames.repair,
    image: "/male_escort.jpeg",
    button: "Post Ad",
    description:
      "Premium *male escort* services for discerning clients. Our professional *male escorts* offer discreet companionship, charming conversation, and unforgettable experiences. Book verified *male escort* companions 24/7 with complete privacy guaranteed. Reserve yours today!.",
  },
  {
    id: "massage",
    title: serviceNames.massage,
    image: "/massaga.jpeg",
    button: "Post Ad",
    description:
      "Experience ultimate relaxation with our professional *massage service. Skilled therapists offer Swedish, deep tissue, and sensual **massage* treatments. Book rejuvenating *massage services* 24/7 for stress relief and complete satisfaction. Schedule your session today!.",
  },
] as const;

const serviceSummaryNames = Object.values(serviceNames).map((name) =>
  name.toLowerCase()
);

export const serviceSummaryText = `Rojlo is your local services marketplace for finding trusted help across ${serviceSummaryNames[0]}, ${serviceSummaryNames[1]}, and ${serviceSummaryNames[2]} bookings in one simple place.`;
