export function canDelegate(fromPosition, toPosition) {
  return Boolean(
    fromPosition &&
      toPosition &&
      toPosition.is_delegatable === 1 &&
      fromPosition.priority < toPosition.priority
  );
}

export function canShare(fromPosition, toPosition) {
  return Boolean(
    fromPosition &&
      toPosition &&
      fromPosition.priority === toPosition.priority
  );
}
