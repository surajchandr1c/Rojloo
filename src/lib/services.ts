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
      "Connect with verified call girls for companionship and personalized meetups in your city.",
  },
  {
    id: "male-escorts",
    title: serviceNames.repair,
    image: "/male_escort.jpeg",
    button: "Post Ad",
    description:
      "Book male escorts for companionship, events, and private meetups tailored to your preferences.",
  },
  {
    id: "massage",
    title: serviceNames.massage,
    image: "/massaga.jpeg",
    button: "Post Ad",
    description:
      "Relax with professional massage services designed to reduce stress, improve comfort, and support your overall wellness.",
  },
] as const;

const serviceSummaryNames = Object.values(serviceNames).map((name) =>
  name.toLowerCase()
);

export const serviceSummaryText = `Rojlo is your local services marketplace for finding trusted help across ${serviceSummaryNames[0]}, ${serviceSummaryNames[1]}, and ${serviceSummaryNames[2]} bookings in one simple place.`;
