import { useMemo } from 'react';

function Avatar({ name, size = 40 }) {
  // 生成随机颜色
  const backgroundColor = useMemo(() => {
    const colors = [
      '#F87171', // 红色
      '#FB923C', // 橙色
      '#FBBF24', // 黄色
      '#34D399', // 绿色
      '#60A5FA', // 蓝色
      '#818CF8', // 靛蓝
      '#A78BFA', // 紫色
    ];
    // 使用名字作为种子来选择颜色，这样同一个用户总是得到相同的颜色
    const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
    return colors[index];
  }, [name]);

  // 获取名字的首字母（大写）
  const initials = useMemo(() => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2); // 最多取两个字母
  }, [name]);

  return (
    <div
      style={{
        width: size,
        height: size,
        backgroundColor,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontSize: `${size * 0.4}px`,
        fontWeight: 'bold',
        userSelect: 'none'
      }}
    >
      {initials}
    </div>
  );
}

export default Avatar; 