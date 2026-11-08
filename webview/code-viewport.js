/** Match the colored mirror to the textarea viewport, excluding native scrollbars; both layers use a one-pixel CSS border. */
function syncCodeViewport(input, mirror) {
  if (!input || !mirror) return;
  mirror.style.width = `${input.clientWidth + 2}px`;
  mirror.style.height = `${input.clientHeight + 2}px`;
  mirror.scrollTop = input.scrollTop;
  mirror.scrollLeft = input.scrollLeft;
}

module.exports = { syncCodeViewport };
