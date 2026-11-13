export function canDelegate(fromPosition, toPosition) {
  const isDelegatable =
    toPosition &&
    (toPosition.is_delegatable === 1 ||
      toPosition.is_delegatable === true ||
      toPosition.is_delegatable === '1');

  return Boolean(
    fromPosition &&
      toPosition &&
      isDelegatable &&
      Number(fromPosition.priority) < Number(toPosition.priority)
  );
}

export function canShare(fromPosition, toPosition) {
  return Boolean(
    fromPosition &&
      toPosition &&
      Number(fromPosition.priority) === Number(toPosition.priority)
  );
}
