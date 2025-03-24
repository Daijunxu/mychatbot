import { useMemo } from 'react';

function Avatar({ name = '', size = 40 }) {
  // 马卡龙色系
  const backgroundColor = useMemo(() => {
    const colors = [
      '#FFB5E8', // 粉色
      '#B5B9FF', // 淡紫色
      '#97E1D4', // 薄荷绿
      '#F6A6C1', // 玫瑰粉
      '#FFCCB6', // 杏色
      '#B5DEFF', // 天蓝色
      '#E2F0CB', // 淡绿色
      '#DCD3FF', // 薰衣草色
    ];
    
    if (!name) return colors[0];  // 如果没有名字，返回第一个颜色
    
    // 使用名字作为种子来选择颜色
    const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
    return colors[index];
  }, [name]);

  // 获取名字的首字母（大写）
  const initials = useMemo(() => {
    if (!name) return '?';  // 如果没有名字，显示问号
    
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
        userSelect: 'none',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}
    >
      {initials}
    </div>
  );
}

export default Avatar; 