
export const isNear = (
  currentPosition: [number, number],
  targetPosition: [number, number],
  toleranceMeters: number
): boolean => {
  const [lat1, lon1] = currentPosition;
  const [lat2, lon2] = targetPosition;

  const toRad = (x: number) => (x * Math.PI) / 180;
  const R = 6371000; // meter
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance <= toleranceMeters;
};
