export const choice = <T>(list: Array<T>): T => {
  return list[Math.floor(Math.random() * list.length)];
};
