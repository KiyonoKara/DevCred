/**
 * Formats deadline into readable string
 * @param deadline raw deadline string from database
 * @returns Formatted date
 */
export default function formattedDate(deadline: string | Date) {
  const date = new Date(deadline);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toLocaleDateString();
}
