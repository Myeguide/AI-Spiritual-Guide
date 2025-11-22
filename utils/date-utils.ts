/**
 * Calculate age from date of birth
 * @param dob - Date of birth (Date object, string in YYYY-MM-DD format, or ISO string)
 * @returns Age in years
 */
export function calculateAge(dob: Date | string): number {
  if (!dob) {
    console.error('DOB is required');
    return 0;
  }

  const today = new Date();
  
  // Handle both Date objects and string formats
  const birthDate = dob instanceof Date ? dob : new Date(dob);

  // Validate the date
  if (isNaN(birthDate.getTime())) {
    return 0;
  }

  // Check if birth date is in the future
  if (birthDate > today) {
    return 0;
  }

  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  // Adjust age if birthday hasn't occurred this year
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age--;
  }

  // Additional validation: age should be reasonable (0-150)
  if (age < 0 || age > 150) {
    return 0;
  }

  return age;
}