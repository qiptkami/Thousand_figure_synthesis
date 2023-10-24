export function mostBlockColors(blockList) {
  const blockMainColors = [];
  for (let i = 0; i < blockList.length; i++) {
    let r = 0,
      g = 0,
      b = 0,
      a = 0;
    for (let j = 0; j < blockList[i].color[j].length; j++) {
      r += blockList[i].color[j][0];
      g += blockList[i].color[j][1];
      b += blockList[i].color[j][2];
      a += blockList[i].color[j][3];
    }
    // 求取平均值
    r /= blockList[i].color[0].length;
    g /= blockList[i].color[0].length;
    b /= blockList[i].color[0].length;
    a /= blockList[i].color[0].length;
    // 将最终的值取整
    r = Math.round(r);
    g = Math.round(g);
    b = Math.round(b);
    a = Math.round(a);
    blockMainColors.push({
      position: blockList[i].position,
      color: [r, g, b, a],
    });
  }
  return blockMainColors;
}
