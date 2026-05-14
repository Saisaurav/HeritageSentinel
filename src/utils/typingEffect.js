export async function typeText({
  text,
  speed = 20,
  onTick,
  onDone
}) {
  const content = String(text ?? '');
  let current = '';

  for (let i = 0; i < content.length; i++) {
    current += content[i];
    onTick?.(current);

    await new Promise(resolve => setTimeout(resolve, speed));
  }

  onDone?.(content);
}

