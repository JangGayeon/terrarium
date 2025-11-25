import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Alert,
  TextInput,
  Image,
  Dimensions,
  Platform,
  Animated,
  PanResponder,
  Modal,
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from 'expo-document-picker';
import { NavigationContainer, useNavigation } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

const Stack = createNativeStackNavigator();

/* 공통 헤더 로고 */
function HeaderLogo() {
  const navigation = useNavigation();
  const canGoBack = navigation.canGoBack();

  return (
    <View style={styles.headerRow}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          {canGoBack ? (
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              accessibilityLabel="이전으로"
            >
              <Text style={styles.backButtonText}>‹</Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity onPress={() => navigation.navigate("Home")}>
            <View style={styles.logoRow}>
              <View style={styles.logoCircle}>
                <Text style={{ fontSize: 18 }}>🌿</Text>
              </View>
              <View style={{ marginLeft: 8 }}>
                <Text style={styles.logoTitle}>Healing Garden</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

/* 하단 탭 네비게이션 (모양만) */
function BottomNav({ navigation, current }) {
  const Item = ({ label, route, icon }) => {
    const isActive = current === route;
    const onPress = () => {
      if (!route) {
        Alert.alert("준비 중", "이 메뉴는 나중에 구현할 예정이에요 😊");
        return;
      }
      if (route !== current) navigation.navigate(route);
    };

    return (
      <TouchableOpacity
        style={[styles.bottomItem, isActive && styles.bottomItemActive]}
        onPress={onPress}
      >
        <Text style={styles.bottomIcon}>{icon}</Text>
        <Text
          style={[
            styles.bottomLabel,
            isActive && { color: "#145c35", fontWeight: "600" },
          ]}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.bottomNav}>
      <Item label="홈" route="Home" icon="🏠" />
      <Item label="캘린더" route="Calendar" icon="📅" />
      <Item label="알림" route="Notification" icon="🔔" />
      <Item label="사용자" route="User" icon="👤" />
    </View>
  );
}

/* ---------- 1. 스플래시 ---------- */
function SplashScreen({ navigation }) {
  useEffect(() => {
    const t = setTimeout(() => navigation.replace("Home"), 1500);
    return () => clearTimeout(t);
  }, [navigation]);

  return (
    <View style={styles.splashContainer}>
      <View style={styles.splashBackground}>
        <SafeAreaView style={styles.splashContent}>
          <Text style={styles.splashSubtitle}>내 손안에 작은 공간</Text>
          <Text style={styles.splashSubtitle}>테라리움</Text>
          <Text style={styles.splashTitle}>Healing{"\n"}Garden</Text>
        </SafeAreaView>
      </View>
    </View>
  );
}

/* ---------- 2. 홈 화면 ---------- */
function HomeScreen({ navigation, terrariums, activeIndex, setActiveIndex, setTerrariums }) {
  const temp = 22;
  const hum = 55;
  const lux = 55;
  // Keep card sizing stable by computing once and updating on dimension changes
  const scrollRef = useRef(null);
  // calculate layout and include left offset to align with header logo
  // pull the card a little further left (negative adjust) so the card's left edge visually lines up with the logo text
  const LOGO_LEFT = 12; // header paddingHorizontal + logoCircle width + logoRow marginLeft - tweak (-27 to nudge left)
  const [layout, setLayout] = useState(() => {
    const w = Dimensions.get("window").width;
    const card = w < 420 ? w - 60 : Math.min(520, Math.round(w * 0.75));
    const gap = 16;
    const pad = Math.max(12, Math.round((w - card) / 2));
    return { windowWidth: w, CARD_WIDTH: card, PAGE_GAP: gap, H_PADDING: pad, PAGE_WIDTH: card + gap };
  });

  useEffect(() => {
    const onChange = ({ window }) => {
      const w = window.width;
      const card = w < 420 ? w - 60 : Math.min(520, Math.round(w * 0.75));
      const gap = 16;
      const pad = Math.max(12, Math.round((w - card) / 2));
      setLayout({ windowWidth: w, CARD_WIDTH: card, PAGE_GAP: gap, H_PADDING: pad, PAGE_WIDTH: card + gap });
    };
    const sub = Dimensions.addEventListener ? Dimensions.addEventListener('change', onChange) : Dimensions.addEventListener('change', onChange);
    return () => {
      try { Dimensions.removeEventListener('change', onChange); } catch (e) { /* RN version differences */ }
      try { sub && sub.remove && sub.remove(); } catch (e) {}
    };
  }, []);
  

  

  const goToIndex = (idx) => {
    if (!scrollRef.current) return;
    const clamped = Math.max(0, Math.min(idx, terrariums.length - 1));
    scrollRef.current.scrollTo({ x: clamped * layout.PAGE_WIDTH, animated: true });
    setActiveIndex(clamped);
  };

  const goPrev = () => goToIndex(activeIndex - 1);
  const goNext = () => goToIndex(activeIndex + 1);

  // Ensure the active card is centered when the screen mounts
  useEffect(() => {
    const t = setTimeout(() => {
      goToIndex(activeIndex);
    }, 50);
    return () => clearTimeout(t);
  }, []);

  return (
    <SafeAreaView style={styles.screenBase}>
      <StatusBar barStyle="dark-content" />
      <HeaderLogo />
  <ScrollView contentContainerStyle={[styles.screenScroll, { paddingTop: 24 }]}>
        {/* 테라리움 카드들: 가로 스와이프 캐러셀 */}
        <View style={{ position: "relative" }}>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          ref={scrollRef}
          onMomentumScrollEnd={(e) => {
            const x = e.nativeEvent.contentOffset.x;
            let idx = Math.round(x / layout.PAGE_WIDTH);
            if (idx < 0) idx = 0;
            if (idx >= terrariums.length) idx = terrariums.length - 1;
            setActiveIndex(idx);
          }}
          // left-align cards to logo: use explicit paddingLeft to match header logo start
          contentContainerStyle={{ paddingLeft: LOGO_LEFT, paddingRight: layout.H_PADDING }}
        >
          {terrariums.map((t, idx) => {
            const isActive = idx === activeIndex;
            return (
              <View
                key={idx}
                style={[
                    styles.terrariumCard,
                    { width: layout.CARD_WIDTH, marginRight: idx === terrariums.length - 1 ? 0 : layout.PAGE_GAP, alignSelf: 'flex-start' },
                    // use subtle border color for active card instead of scale to avoid layout shift
                    isActive && { borderColor: '#9AE6B4' },
                  ]}
              >
                <View style={styles.terrariumHeaderRow}>
                  <View>
                    <Text style={styles.terrariumTitle}>{t.name}</Text>
                    <Text style={styles.terrariumSubtitle}>{t.plantType}</Text>
                  </View>
                  <TouchableOpacity onPress={() => navigation.navigate("TerrariumSettings") }>
                    <Text style={{ fontSize: 18 }}>⚙️</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.terrariumImagePlaceholder}>
                  {t.image ? (
                    <Image source={{ uri: t.image }} style={styles.terrariumImage} resizeMode="cover" />
                  ) : (
                    <Text style={{ color: "#64748b", fontSize: 12 }}>테라리움 이미지 자리</Text>
                  )}
                </View>

                {/* 테라리움 정보: 센서 데이터는 카드 안에 배치 */}
                <View style={styles.sensorRowCard}>
                  <SensorCircle label="온도" value={`${t.temp ?? 0}°C`} numeric={typeof t.temp === 'number' ? t.temp : null} />
                  <SensorCircle label="습도" value={`${t.hum ?? 0}%`} numeric={typeof t.hum === 'number' ? t.hum : null} />
                  <SensorCircle label="조도" value={`${t.lux ?? 0} lx`} numeric={typeof t.lux === 'number' ? t.lux : null} ledColor={t.ledColor} />
                </View>
                <View style={{ marginTop: 12 }}>
                  <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => {
                      setActiveIndex(idx);
                      navigation.navigate("TerrariumControl");
                    }}
                  >
                    <Text style={styles.addButtonText}>제어하기</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </ScrollView>

        {/* 이전/다음 버튼 제거: 모바일 스와이프로만 제어하도록 함 */}
        </View>

        {/* ensure initial card is scrolled into centered position on mount (handled in useEffect above) */}

        {/* 캐러셀 점 표시: 카드 바깥(아래)에 하나만 렌더링 */}
        <View style={[styles.carouselDots, { marginTop: 12, width: layout.CARD_WIDTH, alignSelf: 'flex-start' }]}>
          {terrariums.map((_, i) => (
            <View key={i} style={[styles.dot, i === activeIndex && styles.dotActive]} />
          ))}
        </View>

        {/* + 추가하기 버튼 */}
        <TouchableOpacity
          style={[styles.addButton, { width: layout.CARD_WIDTH, alignSelf: 'center' }]}
          onPress={() => Alert.alert("추가하기", "새 테라리움 추가 기능 예정")}
        >
          <Text style={styles.addButtonText}>+ 추가하기</Text>
        </TouchableOpacity>

        {/* global control button removed: use per-card 제어하기 instead */}
        
      </ScrollView>

      <BottomNav navigation={navigation} current="Home" />
    </SafeAreaView>
  );
}

// Determine a border color for the sensor based on numeric value and label
function computeSensorColor({ label, numeric, ledColor }) {
  // If explicit ledColor provided (for lux), use it
  if (label && label.indexOf("조도") !== -1) {
    if (ledColor) return ledColor;
    // default lux thresholds
    const n = typeof numeric === 'number' ? numeric : null;
    if (n === null) return '#facc15';
    if (n < 50) return '#f59e0b'; // low -> orange
    if (n <= 800) return '#facc15'; // normal -> yellow
    return '#f97316'; // very bright -> orange/red
  }

  // Temperature thresholds
  if (label && (label.indexOf('온도') !== -1 || label.indexOf('온도') !== -1)) {
    const n = typeof numeric === 'number' ? numeric : null;
    const min = 20, max = 26;
    if (n === null) return '#4ade80';
    if (n >= min && n <= max) return '#4ade80'; // green
    if (n >= min - 3 && n < min) return '#f59e0b'; // slightly low -> orange
    if (n > max && n <= max + 3) return '#f59e0b'; // slightly high
    return '#ef4444'; // far out -> red
  }

  // Humidity thresholds
  if (label && label.indexOf('습도') !== -1) {
    const n = typeof numeric === 'number' ? numeric : null;
    const min = 40, max = 70;
    if (n === null) return '#22c55e';
    if (n >= min && n <= max) return '#22c55e';
    if (n >= min - 10 && n < min) return '#f59e0b';
    if (n > max && n <= max + 10) return '#f59e0b';
    return '#ef4444';
  }

  // default
  return '#d1d5db';
}

function SensorCircle({ label, value, numeric, color, ledColor }) {
  // compute color unless explicitly provided
  const border = color || computeSensorColor({ label, numeric, ledColor });
  return (
    <View style={styles.sensorCircleBox}>
      <View style={[styles.sensorCircleOuter, { borderColor: border }]}>
        <View style={styles.sensorCircleInner}>
          <Text style={styles.sensorValue}>{value}</Text>
        </View>
      </View>
      <Text style={styles.sensorLabel}>{label}</Text>
    </View>
  );
}

/* Toggle switch with swipe/drag and tap support */
function ToggleSwitch({ value, onValueChange, onColor = '#34d399', offColor = '#e5e7eb', width = 56, height = 32, leftIsOn = false }) {
  const knobSize = height - 8;
  const range = width - knobSize - 8; // left/right travel
  // anim represents display position: 0 = left, 1 = right
  const initialDisplay = leftIsOn ? (value ? 0 : 1) : (value ? 1 : 0);
  const anim = useRef(new Animated.Value(initialDisplay)).current;
  const mountedRef = useRef(true);

  useEffect(() => {
    if (!mountedRef.current) return;
    const to = leftIsOn ? (value ? 0 : 1) : (value ? 1 : 0);
    Animated.timing(anim, { toValue: to, duration: 180, useNativeDriver: false }).start();
  }, [value, leftIsOn]);

  useEffect(() => () => { mountedRef.current = false; }, []);

  const valueRef = useRef(value);
  useEffect(() => { valueRef.current = value; }, [value]);

  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {
      anim.setOffset(anim._value || 0);
      anim.setValue(0);
    },
    onPanResponderMove: (e, g) => {
      const dx = g.dx / range; // normalize
      const next = Math.max(0, Math.min(1, (anim._offset || 0) + dx));
      anim.setValue(next - (anim._offset || 0));
    },
    onPanResponderRelease: (e, g) => {
      anim.flattenOffset();
      // detect tap (very small movement)
      const isTap = Math.abs(g.dx) < 6 && Math.abs(g.dy) < 6;
      if (isTap) {
        // toggle logical value
        const newLogical = !valueRef.current;
        const to = leftIsOn ? (newLogical ? 0 : 1) : (newLogical ? 1 : 0);
        Animated.timing(anim, { toValue: to, duration: 140, useNativeDriver: false }).start(() => {
          if (onValueChange) onValueChange(newLogical);
        });
        return;
      }
      const v = anim.__getValue ? anim.__getValue() : (anim._value || 0);
      const newDisplay = v >= 0.5; // true => right, false => left
      const newLogical = leftIsOn ? !newDisplay : newDisplay; // map display to logical on/off
      Animated.timing(anim, { toValue: newDisplay ? 1 : 0, duration: 140, useNativeDriver: false }).start(() => {
        if (onValueChange) onValueChange(newLogical);
      });
    },
  })).current;

  const translateX = anim.interpolate({ inputRange: [0, 1], outputRange: [0, range] });
  const trackColor = anim.interpolate ? anim.interpolate({ inputRange: [0, 1], outputRange: leftIsOn ? [onColor, offColor] : [offColor, onColor] }) : (value ? onColor : offColor);

  return (
    <Animated.View
      style={[styles.switchTrack, { width, height, borderRadius: height / 2, backgroundColor: trackColor }]}
      {...pan.panHandlers}
    >
      <Animated.View
        style={[styles.switchKnob, { width: knobSize, height: knobSize, borderRadius: knobSize / 2, transform: [{ translateX }] }]}
      />
    </Animated.View>
  );
}

/* Icon toggle component: pill-shaped toggle with icon and ON/OFF knob */
// IconToggle removed: reverting to original rectangular device buttons

/* ---------- 3. 메뉴 화면 ---------- */
function MenuScreen({ navigation, terrariums, setTerrariums, setActiveIndex, activeIndex }) {
  const [menuOpen, setMenuOpen] = useState(false);

  const go = (type) => {
    if (type === "조도" || type === "온도" || type === "습도") {
      navigation.navigate("LightControl");
    } else if (type === "배경") navigation.navigate("Background");
    else if (type === "사용자 설정") navigation.navigate("TerrariumSettings");
    else if (type === "음악") {
      Alert.alert("음악", "음악 재생 기능은 추후 구현됩니다.");
    }
    else {
      Alert.alert(
        `${type} 메뉴`,
        "이 기능은 나중에 구현할 예정이에요 :) (IoT 센서랑 연동)"
      );
    }
  };

  const addTerrarium = () => {
    const newT = {
      name: `새 정원 ${terrariums.length + 1}`,
      plantType: "허브류",
      waterAlert: false,
      lightAlert: false,
      image: null,
      temp: 20,
      hum: 50,
      lux: 50,
    };
    const updated = [...terrariums, newT];
    setTerrariums(updated);
    setActiveIndex(updated.length - 1);
    navigation.navigate("TerrariumSettings");
  };

  const MenuTile = ({ label, icon, highlight, onPress }) => (
    <TouchableOpacity
      style={[
        styles.menuTile,
        highlight && { backgroundColor: "#c5f1c9" },
      ]}
      onPress={onPress || (() => go(label))}
    >
      <Text style={styles.menuTileIcon}>{icon}</Text>
      <Text style={styles.menuTileLabel}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.screenBase}>
      <HeaderLogo />
      <View style={[styles.menuContainer, { position: "relative" }]}>
        <View style={styles.menuHeaderRow}>
          <View>
            <Text style={styles.sectionTitle}>메뉴</Text>
            <Text style={styles.menuSubTitle}>{terrariums[activeIndex]?.name ?? "선택된 정원 없음"}</Text>
          </View>
          <TouchableOpacity style={styles.menuToggle} onPress={() => setMenuOpen((s) => !s)}>
            <Text style={{ fontSize: 18 }}>☰</Text>
          </TouchableOpacity>
        </View>

        {menuOpen && (
          <View style={styles.menuDropdown}>
            {terrariums.map((t, i) => (
              <TouchableOpacity
                key={i}
                style={styles.dropdownItemWrap}
                onPress={() => {
                  setActiveIndex(i);
                  setMenuOpen(false);
                  // Do NOT navigate away: menu should show controls for selected terrarium
                }}
              >
                <Text style={[styles.dropdownItem, i === activeIndex && styles.dropdownItemActive]}>{t.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.menuGrid}>
          <MenuTile label="온도" icon="🌡️" />
          <MenuTile label="조도" icon="💡" />
          <MenuTile label="습도" icon="💧" />
          <MenuTile label="배경" icon="🖼️" />
          <MenuTile label="음악" icon="🎵" />
          <MenuTile label="사용자 설정" icon="⚙️" highlight />
          <MenuTile label="테라리움 추가" icon="➕" onPress={addTerrarium} />
        </View>
      </View>
      <BottomNav navigation={navigation} current="Menu" />
    </SafeAreaView>
  );
}

/* ---------- 알림 화면 ---------- */
function NotificationScreen({ navigation, terrariums, setTerrariums, activeIndex, setActiveIndex }) {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    // sample / example notifications to show helpful hints
    const sample = [
      { id: 's1', terrariumIndex: 0, title: '로오즈마아리 - 성장이 관찰되었습니다', message: '어제보다 잎 길이가 약 1.2cm 성장했습니다. 성장 추이를 확인해보세요.', type: 'info' },
      { id: 's2', terrariumIndex: 1, title: '민트정원 - 물 부족 징후', message: '토양 수분이 낮습니다. 물주기를 고려하세요.', type: 'warning' },
      { id: 's3', terrariumIndex: 2, title: '선인장방 - 과도한 조도', message: '조도가 높습니다. 직사광선을 피하세요.', type: 'warning' },
    ];

    const dynamic = [];
    terrariums.forEach((t, idx) => {
      const name = t.name || `정원 ${idx + 1}`;
      const temp = typeof t.temp === 'number' ? t.temp : null;
      const hum = typeof t.hum === 'number' ? t.hum : null;
      const lux = typeof t.lux === 'number' ? t.lux : null;
      if (hum !== null && hum < 35) dynamic.push({ id: `hum_low_${idx}`, terrariumIndex: idx, title: `${name} - 습도 낮음`, message: `현재 ${hum}%. 습도 관리가 필요합니다.`, type: 'alert' });
      if (temp !== null && temp < 16) dynamic.push({ id: `temp_low_${idx}`, terrariumIndex: idx, title: `${name} - 온도 매우 낮음`, message: `현재 ${temp}°C입니다. 온도 조절을 고려하세요.`, type: 'alert' });
    });

    // combine sample + dynamic, dedupe by id
    const combined = [...sample, ...dynamic];
    setNotifications(combined);
  }, [terrariums]);

  const goToControl = (terrariumIndex) => {
    // navigate to control page and set active index
    try {
      if (typeof setActiveIndex === 'function') setActiveIndex(terrariumIndex);
      navigation.navigate('TerrariumControl');
    } catch (e) {
      console.warn('goToControl error', e);
    }
  };

  return (
    <SafeAreaView style={styles.screenBase}>
      <HeaderLogo />
      <ScrollView contentContainerStyle={styles.screenScroll}>
        <Text style={styles.sectionTitle}>알림</Text>

        <View style={{ marginTop: 12 }}>
          {notifications.length === 0 ? (
            <View style={[styles.card]}>
              <Text style={{ color: '#6b7280' }}>현재 알림이 없습니다.</Text>
            </View>
          ) : (
            notifications.map((n) => (
              <TouchableOpacity key={n.id} onPress={() => goToControl(n.terrariumIndex)} style={[styles.card, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, marginBottom: 10 }]}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#111827' }}>{n.title}</Text>
                  <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>{n.message}</Text>
                </View>
                <View style={{ width: 24, alignItems: 'center' }}>
                  <Text style={{ fontSize: 22, color: '#9ca3af' }}>›</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
      <BottomNav navigation={navigation} current="Notification" />
    </SafeAreaView>
  );
}

/* ---------- 4. 조도 제어 화면 ---------- */
function LightControlScreen({ navigation, terrariums, setTerrariums, activeIndex }) {
  const current = terrariums[activeIndex] || {};
  const [selectedColor, setSelectedColor] = useState(current.ledColor || "#F1A901");
  const [hexInput, setHexInput] = useState((current.ledColor || "#F1A901").replace("#", ""));

  const SWATCHES = ["#F1A901", "#FF6B6B", "#4ADE80", "#60A5FA", "#A78BFA", "#F97316"];

  const [wheelLayout, setWheelLayout] = useState(null);

  const hsvToHex = (h, s, v) => {
    // h: 0-360, s: 0-1, v:0-1
    const c = v * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = v - c;
    let r = 0,
      g = 0,
      b = 0;
    if (h >= 0 && h < 60) {
      r = c;
      g = x;
      b = 0;
    } else if (h < 120) {
      r = x;
      g = c;
      b = 0;
    } else if (h < 180) {
      r = 0;
      g = c;
      b = x;
    } else if (h < 240) {
      r = 0;
      g = x;
      b = c;
    } else if (h < 300) {
      r = x;
      g = 0;
      b = c;
    } else {
      r = c;
      g = 0;
      b = x;
    }
    const R = Math.round((r + m) * 255);
    const G = Math.round((g + m) * 255);
    const B = Math.round((b + m) * 255);
    const toHex = (n) => n.toString(16).padStart(2, "0").toUpperCase();
    return `#${toHex(R)}${toHex(G)}${toHex(B)}`;
  };

  const onWheelTouch = (evt) => {
    if (!wheelLayout) return;
    const { locationX, locationY } = evt.nativeEvent;
    const cx = wheelLayout.width / 2;
    const cy = wheelLayout.height / 2;
    const dx = locationX - cx;
    const dy = locationY - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const radius = Math.min(wheelLayout.width, wheelLayout.height) / 2;
    if (dist > radius) return; // outside wheel
    let angle = (Math.atan2(dy, dx) * 180) / Math.PI; // -180..180
    if (angle < 0) angle += 360;
    const hue = angle; // 0..360
    const sat = Math.min(1, dist / radius); // 0..1
    const val = 1; // keep brightness at full
    const hex = hsvToHex(hue, sat, val);
    setSelectedColor(hex);
    setHexInput(hex.replace("#", ""));
  };

  const sendToDevice = (color) => {
    // TODO: 실제 하드웨어 API 호출을 이 함수에 구현하세요.
    // 예: fetch('http://device.local/setColor', { method: 'POST', body: JSON.stringify({ color }) })
    console.log("sendToDevice placeholder, color=", color);
    // 현재는 전송 기능을 비워둡니다.
  };

  const applyColorToTerrarium = () => {
    const updated = [...terrariums];
    updated[activeIndex] = {
      ...(updated[activeIndex] || {}),
      ledColor: selectedColor,
    };
    setTerrariums(updated);
    // 실제 API 전송은 주석 처리한 sendToDevice 호출 위치에 구현하세요.
    // sendToDevice(selectedColor);
    Alert.alert("저장됨", `선택한 색 ${selectedColor}이 현재 정원에 저장되었습니다. (전송은 미구현)`);
  };

  const onHexChange = (text) => {
    // 간단한 헥스 유효성 검사(6자리 허용)
    const clean = text.replace(/[^0-9a-fA-F]/g, "").slice(0, 6);
    setHexInput(clean);
    if (clean.length === 6) {
      setSelectedColor(`#${clean.toUpperCase()}`);
    }
  };

  return (
    <SafeAreaView style={styles.screenBase}>
      <HeaderLogo />
      <ScrollView contentContainerStyle={styles.screenScroll}>
        <Text style={styles.sectionTitle}>조도</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>LED 색상 선택</Text>

          <Text style={[styles.cardSubtitle, { marginTop: 6 }]}>컬러 휠</Text>
          <View
            style={{ alignItems: "center", marginTop: 8 }}
            onStartShouldSetResponder={() => true}
            onResponderGrant={onWheelTouch}
            onResponderMove={onWheelTouch}
            onLayout={(e) => setWheelLayout(e.nativeEvent.layout)}
          >
            {/** Place your color wheel image at `assets/images/color-wheel.png`. If not present, this will show a placeholder box. */}
            {/** eslint-disable-next-line global-require */}
            {(() => {
              try {
                const wheel = require("./assets/images/color-wheel.png");
                return (
                  <Image source={wheel} style={{ width: 220, height: 220, borderRadius: 110 }} />
                );
              } catch (e) {
                return (
                  <View style={{ width: 220, height: 220, borderRadius: 110, backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#e5e7eb" }}>
                    <Text style={{ color: "#64748b" }}>색상 휠 이미지 없음{`\n`}assets/images/color-wheel.png</Text>
                  </View>
                );
              }
            })()}
          </View>

          <Text style={[styles.cardSubtitle, { marginTop: 12 }]}>추천 색상</Text>
          <View style={styles.swatchRow}>
            {SWATCHES.map((c) => (
              <TouchableOpacity
                key={c}
                style={[styles.swatch, { backgroundColor: c, borderWidth: selectedColor === c ? 3 : 0, borderColor: "#145c35" }]}
                onPress={() => {
                  setSelectedColor(c);
                  setHexInput(c.replace("#", ""));
                }}
              />
            ))}
          </View>

          <Text style={[styles.cardSubtitle, { marginTop: 12 }]}>직접 입력 (HEX)</Text>
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8 }}>
            <View style={[styles.colorPreviewBox, { backgroundColor: selectedColor }]} />
            <TextInput
              value={hexInput}
              onChangeText={onHexChange}
              placeholder="RRGGBB"
              style={[styles.inputBox, { marginLeft: 10, flex: 1 }]}
            />
          </View>

          <View style={{ flexDirection: "row", marginTop: 18, gap: 8 }}>
            <TouchableOpacity style={[styles.addButton, { flex: 1 }]} onPress={applyColorToTerrarium}>
              <Text style={styles.addButtonText}>선택 저장</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.addButton, { flex: 1, backgroundColor: "#ef4444" }]}
              onPress={() => {
                setSelectedColor("#000000");
                setHexInput("000000");
              }}
            >
              <Text style={styles.addButtonText}>리셋</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
      <BottomNav navigation={navigation} current={null} />
    </SafeAreaView>
  );
}

/* ---------- 5. 배경 설정 화면 ---------- */
function BackgroundScreen({ navigation }) {
  const BgItem = ({ label }) => (
    <TouchableOpacity
      style={styles.bgItem}
      onPress={() => Alert.alert("배경 선택", `"${label}" 배경 선택 (가상)`)}
    >
      <View style={styles.bgImagePlaceholder}>
        <Text style={{ color: "#e5e7eb", fontSize: 12 }}>{label}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.screenBase}>
      <HeaderLogo />
      <ScrollView contentContainerStyle={styles.screenScroll}>
        <Text style={styles.sectionTitle}>배경</Text>

        <Text style={styles.bgSectionLabel}>기본 배경화면</Text>
        <BgItem label="숲 배경" />
        <BgItem label="노을 배경" />

        <Text style={[styles.bgSectionLabel, { marginTop: 16 }]}>
          사용자 지정
        </Text>
        <TouchableOpacity
          style={styles.bgItem}
          onPress={() =>
            Alert.alert("사용자 배경", "갤러리에서 이미지 불러오는 기능 예정")
          }
        >
          <View
            style={[styles.bgImagePlaceholder, { backgroundColor: "#e2e8f0" }]}
          >
            <Text style={{ color: "#64748b", fontSize: 12 }}>
              사용자 이미지 추가
            </Text>
          </View>
        </TouchableOpacity>
      </ScrollView>
      <BottomNav navigation={navigation} current={null} />
    </SafeAreaView>
  );
}

/* ---------- 사용자 화면 (고객센터, 문의, 계정관리) ---------- */
function UserScreen({ navigation, terrariums, setTerrariums, activeIndex }) {
  const [name, setName] = useState('사용자 이름');
  const [email, setEmail] = useState('user@example.com');
  const [modalOpen, setModalOpen] = useState(false);

  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketMessage, setTicketMessage] = useState('');
  const [tickets, setTickets] = useState([]);

  const submitTicket = async () => {
    if (!ticketSubject || !ticketMessage) {
      Alert.alert('입력 필요', '제목과 내용을 입력해주세요.');
      return;
    }
    const body = { name, email, subject: ticketSubject, message: ticketMessage, createdAt: new Date().toISOString() };
    try {
      const resp = await fetch('http://localhost:3000/support', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (resp.ok) {
        Alert.alert('문의 접수', '고객센터에 문의가 접수되었습니다.');
        setTicketSubject(''); setTicketMessage('');
        const saved = await resp.json().catch(() => null);
        if (saved) setTickets((s) => [saved, ...s]);
        return;
      }
    } catch (e) {
      console.warn('support submit failed', e);
    }
    // fallback: keep locally
    const fake = { id: `local-${Date.now()}`, ...body };
    setTickets((s) => [fake, ...s]);
    Alert.alert('오프라인 저장', '네트워크 문제로 로컬에 저장되었습니다. 나중에 전송하세요.');
    setTicketSubject(''); setTicketMessage('');
  };

  const logout = () => {
    Alert.alert('로그아웃', '로그아웃되었습니다. (기능 미구현)');
  };

  const faq = [
    { q: '물주기 알림은 어떻게 설정하나요?', a: '현재는 자동 알림 기반으로 동작하며, 앞으로 알림 설정 페이지를 추가할 예정입니다.' },
    { q: '장치 연결이 끊겼어요. 어떻게 하나요?', a: '네트워크 상태를 확인하고, Pi나 장치의 전원을 재시작해 보세요.' },
  ];

  return (
    <SafeAreaView style={styles.screenBase}>
      <HeaderLogo />
      <ScrollView contentContainerStyle={styles.screenScroll}>
        <Text style={styles.sectionTitle}>사용자</Text>

        <View style={[styles.card, { marginTop: 12 }]}> 
          <Text style={styles.cardTitle}>계정</Text>
          <Text style={{ color: '#6b7280', marginTop: 4 }}>이름</Text>
          <TextInput value={name} onChangeText={setName} style={[styles.inputBox, { marginTop: 8 }]} />
          <Text style={{ color: '#6b7280', marginTop: 8 }}>이메일</Text>
          <TextInput value={email} onChangeText={setEmail} keyboardType="email-address" style={[styles.inputBox, { marginTop: 8 }]} />
          <View style={{ flexDirection: 'row', marginTop: 12, gap: 8 }}>
            <TouchableOpacity style={[styles.addButton, { flex: 1 }]} onPress={() => setModalOpen(true)}><Text style={styles.addButtonText}>프로필 업데이트</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.addButton, { flex: 1, backgroundColor: '#ef4444' }]} onPress={logout}><Text style={styles.addButtonText}>로그아웃</Text></TouchableOpacity>
          </View>
        </View>

        <View style={[styles.card, { marginTop: 12 }]}> 
          <Text style={styles.cardTitle}>고객센터 문의</Text>
          <TextInput placeholder="문의 제목" value={ticketSubject} onChangeText={setTicketSubject} style={[styles.inputBox, { marginTop: 8 }]} />
          <TextInput placeholder="문의 내용" value={ticketMessage} onChangeText={setTicketMessage} multiline style={[styles.inputBox, { marginTop: 8, height: 100, textAlignVertical: 'top' }]} />
          <View style={{ flexDirection: 'row', marginTop: 10, gap: 8 }}>
            <TouchableOpacity style={[styles.addButton, { flex: 1 }]} onPress={submitTicket}><Text style={styles.addButtonText}>문의 보내기</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.addButton, { flex: 1, backgroundColor: '#6b7280' }]} onPress={() => { setTicketSubject(''); setTicketMessage(''); }}><Text style={styles.addButtonText}>초기화</Text></TouchableOpacity>
          </View>
          {tickets.length > 0 && (
            <View style={{ marginTop: 12 }}>
              <Text style={{ fontWeight: '700', marginBottom: 8 }}>최근 문의</Text>
              {tickets.map((t) => (
                <View key={t.id || t._id} style={{ padding: 8, backgroundColor: '#f8fafc', borderRadius: 8, marginBottom: 8 }}>
                  <Text style={{ fontWeight: '600' }}>{t.subject || t.title || '문의'}</Text>
                  <Text style={{ color: '#6b7280', marginTop: 4, fontSize: 12 }}>{t.message}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={[styles.card, { marginTop: 12 }]}> 
          <Text style={styles.cardTitle}>자주 묻는 질문</Text>
          {faq.map((f, i) => (
            <View key={i} style={{ marginTop: 8 }}>
              <Text style={{ fontWeight: '700' }}>{f.q}</Text>
              <Text style={{ color: '#6b7280', marginTop: 4 }}>{f.a}</Text>
            </View>
          ))}
        </View>

      </ScrollView>

      <Modal visible={modalOpen} animationType="slide" transparent>
        <View style={{ flex:1, backgroundColor:'rgba(0,0,0,0.4)', justifyContent:'center', padding:20 }}>
          <View style={{ backgroundColor:'#fff', borderRadius:12, padding:16 }}>
            <Text style={{ fontSize:16, fontWeight:'700' }}>프로필 업데이트</Text>
            <Text style={{ color:'#6b7280', marginTop:6 }}>이름과 이메일을 확인하세요.</Text>
            <View style={{ marginTop: 12 }}>
              <Text style={{ color:'#6b7280' }}>이름</Text>
              <TextInput value={name} onChangeText={setName} style={[styles.inputBox, { marginTop: 6 }]} />
              <Text style={{ color:'#6b7280', marginTop: 8 }}>이메일</Text>
              <TextInput value={email} onChangeText={setEmail} keyboardType="email-address" style={[styles.inputBox, { marginTop: 6 }]} />
            </View>
            <View style={{ flexDirection:'row', marginTop: 14, gap:8 }}>
              <TouchableOpacity style={[styles.addButton, { flex:1 }]} onPress={() => { setModalOpen(false); Alert.alert('저장됨','프로필이 저장되었습니다.')}}><Text style={styles.addButtonText}>저장</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.addButton, { flex:1, backgroundColor:'#ef4444' }]} onPress={() => setModalOpen(false)}><Text style={styles.addButtonText}>취소</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

/* ---------- 6. 테라리움 설정 화면 ---------- */
function TerrariumControlScreen({ navigation, terrariums, setTerrariums, activeIndex }) {
  const current = terrariums[activeIndex] || {};
  const [temp, setTemp] = useState(current.temp ?? 0);
  const [hum, setHum] = useState(current.hum ?? 0);
  const [lux, setLux] = useState(current.lux ?? 0);
  // simulated device state
  const [waterPumpOn, setWaterPumpOn] = useState(false);
  const [growLightOn, setGrowLightOn] = useState(false);
  const [heaterOn, setHeaterOn] = useState(false);
  const [ventOn, setVentOn] = useState(false);
  const [recommendations, setRecommendations] = useState([]);
  const [evaluating, setEvaluating] = useState(false);
  const [sampleVideos, setSampleVideos] = useState([
    { id: 's1', title: '크리스마스 유럽풍 배경', url: 'https://www.youtube.com/watch?v=JgwsghD0EsY' },
    { id: 's2', title: '허브 성장 영상', url: 'https://example.com/sample2.mp4' },
    { id: 's3', title: '선인장 성장 타임랩스', url: 'https://example.com/sample3.mp4' },
  ]);

  // Fetch latest sensor snapshot from server when entering this screen (if available)
  useEffect(() => {
    let cancelled = false;
    const fetchLatest = async () => {
      try {
        const resp = await fetch(`http://localhost:3000/sensors/${activeIndex}/latest`);
        if (!resp.ok) return;
        const data = await resp.json();
        if (cancelled) return;
        if (data && data.data) {
          const s = data.data;
          if (typeof s.temp === "number") setTemp(s.temp);
          if (typeof s.hum === "number") setHum(s.hum);
          if (typeof s.lux === "number") setLux(s.lux);

          // update global terrariums state so other screens reflect the latest snapshot
          try {
            const updated = [...terrariums];
            updated[activeIndex] = {
              ...(updated[activeIndex] || {}),
              temp: typeof s.temp === 'number' ? s.temp : updated[activeIndex]?.temp,
              hum: typeof s.hum === 'number' ? s.hum : updated[activeIndex]?.hum,
              lux: typeof s.lux === 'number' ? s.lux : updated[activeIndex]?.lux,
            };
            setTerrariums(updated);
          } catch (e) {
            // ignore update errors
          }
        }
      } catch (e) {
        // network failure — ignore and keep local values
        console.warn('Failed to fetch latest sensor snapshot:', e.message || e);
      }
    };

    fetchLatest();
    return () => {
      cancelled = true;
    };
  }, [activeIndex]);

  const handleSave = () => {
    const updated = [...terrariums];
    updated[activeIndex] = {
      ...(updated[activeIndex] || {}),
      temp,
      hum,
      lux,
    };
    setTerrariums(updated);
    navigation.goBack();
  };

  // Basic heuristic evaluator (placeholder for LLM integration)
  const evaluateEnvironment = async () => {
    setEvaluating(true);
    // try remote LLM backend first
    try {
      const resp = await fetch("http://localhost:3000/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: current.name, plantType: current.plantType, temp, hum, lux }),
      });
        
      if (resp.ok) {
        const data = await resp.json();
        if (Array.isArray(data.recommendations)) {
          setRecommendations(data.recommendations);
          setEvaluating(false);
          return data.recommendations;
        }
      }
    } catch (e) {
      // network/backend failed — fall back to local heuristic
      console.warn("LLM backend not available, falling back to local heuristic", e);
    }

    // fallback: local heuristic
    // Small delay to simulate processing
    await new Promise((r) => setTimeout(r, 150));

    const ideal = { temp: { min: 20, max: 26 }, hum: { min: 40, max: 70 }, lux: { min: 50, max: 800 } };
    const recs = [];
  if (temp < ideal.temp.min) recs.push({ id: "temp_low", message: `온도가 낮습니다 (${temp}°C). 온도를 올려주세요 (권장 ${ideal.temp.min}-${ideal.temp.max}°C).`, actionLabel: "히터 가동", actionKey: "heater_on" });
    else if (temp > ideal.temp.max) recs.push({ id: "temp_high", message: `온도가 높습니다 (${temp}°C). 환기하거나 냉각하세요.`, actionLabel: "환기", actionKey: "vent" });
  if (hum < ideal.hum.min) recs.push({ id: "hum_low", message: `습도가 낮습니다 (${hum}%). 워터펌프를 작동시켜 습도를 올려보세요.`, actionLabel: "워터펌프 ON", actionKey: "water_pump_on" });
    else if (hum > ideal.hum.max) recs.push({ id: "hum_high", message: `습도가 높습니다 (${hum}%). 환기를 하거나 분무를 멈추세요.`, actionLabel: "워터펌프 OFF", actionKey: "water_pump_off" });
  if (lux < ideal.lux.min) recs.push({ id: "lux_low", message: `조도가 낮습니다 (${lux} lx). 조명을 높여주세요.`, actionLabel: "조명 ON", actionKey: "grow_light_on" });
    else if (lux > ideal.lux.max) recs.push({ id: "lux_high", message: `조도가 높습니다 (${lux} lx). 조명을 줄이거나 차광하세요.`, actionLabel: "조명 OFF", actionKey: "grow_light_off" });
    if (recs.length === 0) recs.push({ id: "ok", message: `현재 환경은 ${current.name ?? "테라리움"} 에 대해 양호합니다. 계속 관리하세요!`, actionLabel: "문제 없음", actionKey: "none" });

    setRecommendations(recs);
    setEvaluating(false);
    return recs;
  };

  const performAction = (actionKey) => {
    // Try to send device control to server; if server unavailable, fall back to local simulation.
    (async () => {
      try {
        const resp = await fetch("http://localhost:3000/devices/control", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ actionKey, id: activeIndex }),
        });
        if (resp.ok) {
          const data = await resp.json();
          // server may return updated sensor snapshot
          if (data && data.updated) {
            const { temp: t, hum: h, lux: l } = data.updated;
            if (typeof t === 'number') setTemp(t);
            if (typeof h === 'number') setHum(h);
            if (typeof l === 'number') setLux(l);
          }

          // update device on/off states based on actionKey (explicit on/off keys preferred)
          if (actionKey === 'water_pump' || actionKey === 'water_pump_on') setWaterPumpOn(true);
          else if (actionKey === 'water_pump_off') setWaterPumpOn(false);
          else if (actionKey === 'grow_light' || actionKey === 'grow_light_on') setGrowLightOn(true);
          else if (actionKey === 'grow_light_off') setGrowLightOn(false);
          else if (actionKey === 'heater_on') setHeaterOn(true);
          else if (actionKey === 'heater_off') setHeaterOn(false);
          else if (actionKey === 'heater') setHeaterOn((v) => !v);
          else if (actionKey === 'vent_on') setVentOn(true);
          else if (actionKey === 'vent_off') setVentOn(false);
          else if (actionKey === 'vent') setVentOn((v) => !v);

          // Friendly alert messages: map actionKey to ON/OFF user text so the alert matches the intended state
          const friendly = (() => {
            if (actionKey.indexOf('heater') === 0) {
              if (actionKey.indexOf('_on') !== -1) return { title: '히터 ON', body: '히터를 가동했습니다.' };
              if (actionKey.indexOf('_off') !== -1) return { title: '히터 OFF', body: '히터를 중지했습니다.' };
              return { title: '히터', body: '히터 상태가 변경되었습니다.' };
            }
            if (actionKey.indexOf('vent') === 0) {
              if (actionKey.indexOf('_on') !== -1) return { title: '환기 ON', body: '환기를 시작합니다.' };
              if (actionKey.indexOf('_off') !== -1) return { title: '환기 OFF', body: '환기를 중지합니다.' };
              return { title: '환기', body: '환기 상태가 변경되었습니다.' };
            }
            if (actionKey.indexOf('water_pump') === 0) {
              if (actionKey.indexOf('_on') !== -1) return { title: '워터펌프 ON', body: '워터펌프를 작동합니다.' };
              if (actionKey.indexOf('_off') !== -1) return { title: '워터펌프 OFF', body: '워터펌프를 중지합니다.' };
              return { title: '워터펌프', body: '워터펌프 상태가 변경되었습니다.' };
            }
            if (actionKey.indexOf('grow_light') === 0) {
              if (actionKey.indexOf('_on') !== -1) return { title: '조명 ON', body: '조명을 켰습니다.' };
              if (actionKey.indexOf('_off') !== -1) return { title: '조명 OFF', body: '조명을 껐습니다.' };
              return { title: '조명', body: '조명 상태가 변경되었습니다.' };
            }
            // default
            return { title: '장치 제어', body: `서버에 액션을 전송했습니다: ${actionKey}` };
          })();

          Alert.alert(friendly.title, friendly.body);
        } else {
          throw new Error('device control failed');
        }
        } catch (e) {
        // fallback local simulation
        if (actionKey === "water_pump" || actionKey === "water_pump_on") {
          setWaterPumpOn(true);
          const newHum = Math.min(100, hum + 10);
          setHum(newHum);
          Alert.alert("워터펌프 작동 (로컬)", "워터펌프가 켜졌습니다. 습도가 증가합니다.");
        } else if (actionKey === "water_pump_off") {
          setWaterPumpOn(false);
          Alert.alert("워터펌프 중지 (로컬)", "워터펌프를 끕니다.");
        } else if (actionKey === "grow_light" || actionKey === "grow_light_on") {
          setGrowLightOn(true);
          const newLux = Math.min(2000, lux + 200);
          setLux(newLux);
          Alert.alert("조명 ON (로컬)", "조명을 켰습니다. 조도가 증가합니다.");
        } else if (actionKey === "grow_light_off") {
          setGrowLightOn(false);
          Alert.alert("조명 OFF (로컬)", "조명을 껐습니다.");
        } else if (actionKey === "heater_on") {
          setHeaterOn(true);
          const newTemp = Math.min(50, temp + 2);
          setTemp(newTemp);
          Alert.alert("히터 ON (로컬)", "히터를 가동하여 온도를 조금 올립니다.");
        } else if (actionKey === "heater_off") {
          setHeaterOn(false);
          Alert.alert("히터 OFF (로컬)", "히터를 중지합니다.");
        } else if (actionKey === "heater") {
          setHeaterOn((v) => !v);
          const newTemp = Math.min(50, temp + 2);
          setTemp(newTemp);
          Alert.alert("히터 ON (로컬)", "히터를 가동하여 온도를 조금 올립니다.");
        } else if (actionKey === "vent_on") {
          setVentOn(true);
          const newTemp = Math.max(-10, temp - 2);
          setTemp(newTemp);
          Alert.alert("환기 (로컬)", "환기를 통해 온도를 낮춥니다.");
        } else if (actionKey === "vent_off") {
          setVentOn(false);
          Alert.alert("환기 중지 (로컬)", "환기를 중지합니다.");
        } else if (actionKey === "vent") {
          setVentOn((v) => !v);
          const newTemp = Math.max(-10, temp - 2);
          setTemp(newTemp);
          Alert.alert("환기 (로컬)", "환기를 통해 온도를 낮춥니다.");
        }
      } finally {
        // update shared terrariums state so other screens see the change
        const updated = [...terrariums];
        updated[activeIndex] = {
          ...(updated[activeIndex] || {}),
          temp,
          hum,
          lux,
        };
        setTerrariums(updated);
      }
    })();
  };
  
  // LCD control: allows sending play/pause/stop/set_url commands to the server
  const [lcdUrl, setLcdUrl] = useState("");
  const sendLCDCommand = async (action, payload = {}) => {
    try {
      const body = { action, ...payload };
      const resp = await fetch(`http://localhost:3000/lcd/${activeIndex}/command`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (resp.ok) {
        Alert.alert("LCD 제어", `명령 전송: ${action}`);
      } else {
        Alert.alert("LCD 제어 실패", `서버 응답 ${resp.status}`);
      }
    } catch (e) {
      console.warn("Failed to send LCD command:", e);
      Alert.alert("네트워크 오류", "LCD 명령 전송에 실패했습니다.");
    }
  };

  return (
    <SafeAreaView style={styles.screenBase}>
      <HeaderLogo />
      <ScrollView contentContainerStyle={styles.screenScroll}>
        <Text style={styles.sectionTitle}>테라리움 제어</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{current.name || "(선택된 테라리움 없음)"}</Text>
          <View style={{ marginTop: 10 }}>
            <View style={styles.terrariumImagePlaceholder}>
              {/* 이미지 대신 실시간 웹캠 뷰를 렌더링합니다. (웹에서는 브라우저 카메라 권한 요청) */}
              <WebCamView />
            </View>

            <View style={{ marginTop: 12 }}>
                <View style={styles.sensorRowCard}>
                <SensorCircle label="온도" value={`${temp}°C`} numeric={typeof temp === 'number' ? temp : null} />
                <SensorCircle label="습도" value={`${hum}%`} numeric={typeof hum === 'number' ? hum : null} />
                <SensorCircle label="조도" value={`${lux} lx`} numeric={typeof lux === 'number' ? lux : null} ledColor={current.ledColor} />
              </View>
            </View>

            {/* 장치 제어: 스와이프/토글 방식 */}
            <View style={{ marginTop: 16 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', marginBottom: 8 }}>장치 제어</Text>
              <View style={{ marginTop: 6 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ fontSize: 14, color: '#111827', marginRight: 12 }}>히터</Text>
                  </View>
                  <ToggleSwitch
                    value={heaterOn}
                    onValueChange={(v) => { setHeaterOn(v); performAction(v ? 'heater_on' : 'heater_off'); }}
                    onColor="#f97316"
                    offColor="#e5e7eb"
                    leftIsOn={false}
                  />
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <Text style={{ fontSize: 14, color: '#111827' }}>환기 (모터)</Text>
                  <ToggleSwitch
                    value={ventOn}
                    onValueChange={(v) => { setVentOn(v); performAction(v ? 'vent_on' : 'vent_off'); }}
                    onColor="#60a5fa"
                    offColor="#ef4444"
                    leftIsOn={false}
                  />
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <Text style={{ fontSize: 14, color: '#111827' }}>워터펌프</Text>
                  <ToggleSwitch
                    value={waterPumpOn}
                    onValueChange={(v) => { setWaterPumpOn(v); performAction(v ? 'water_pump_on' : 'water_pump_off'); }}
                    onColor="#059669"
                    offColor="#64748b"
                    leftIsOn={false}
                  />
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 14, color: '#111827' }}>조명</Text>
                  <ToggleSwitch
                    value={growLightOn}
                    onValueChange={(v) => { setGrowLightOn(v); performAction(v ? 'grow_light_on' : 'grow_light_off'); }}
                    onColor="#f59e0b"
                    offColor="#6b7280"
                    leftIsOn={false}
                  />
                </View>
              </View>
            </View>

            {/* Garden AI 추천 영역 */}
            <View style={{ marginTop: 18 }}>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Garden AI 추천 환경 제어</Text>
                <Text style={[styles.cardSubtitle, { marginTop: 6 }]}>지금 재배 중인 작물: {current.plantType || "알 수 없음"}</Text>

                <View style={{ marginTop: 10 }}>
                  <TouchableOpacity
                    style={[styles.addButton, { backgroundColor: evaluating ? '#9ca3af' : '#145c35' }]}
                    onPress={() => evaluateEnvironment()}
                    disabled={evaluating}
                  >
                    <Text style={styles.addButtonText}>{evaluating ? '평가중...' : '환경 평가받기'}</Text>
                  </TouchableOpacity>

                  {recommendations.length > 0 && (
                    <View style={{ marginTop: 12 }}>
                      {recommendations.map((r) => (
                        <View key={r.id} style={{ marginBottom: 10 }}>
                          <Text style={{ color: '#374151', marginBottom: 6 }}>{r.message}</Text>
                          {r.actionKey && r.actionKey !== 'none' ? (
                            <TouchableOpacity
                              style={[styles.addButton, { backgroundColor: '#0ea5a4' }]}
                              onPress={() => performAction(r.actionKey)}
                            >
                              <Text style={styles.addButtonText}>{r.actionLabel}</Text>
                            </TouchableOpacity>
                          ) : (
                            <View>
                              <Text style={{ color: '#6b7280' }}>추가 동작 불필요</Text>
                            </View>
                          )}
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </View>
            </View>

            {/* LCD 플레이어 제어 (샘플 / 업로드 / 링크) */}
            <View style={{ marginTop: 18 }}>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>LCD 비디오 재생</Text>
                <Text style={[styles.cardSubtitle, { marginTop: 6 }]}>Raspberry Pi에 연결된 LCD에서 영상 재생을 제어합니다.</Text>

                {/* 1) 기본 제공 샘플 영상 */}
                <View style={{ marginTop: 12 }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', marginBottom: 8 }}>샘플 영상</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {sampleVideos.map((v) => (
                      <View key={v.id} style={{ width: 180, marginRight: 12 }}>
                        <View style={{ height: 100, borderRadius: 8, backgroundColor: '#eef2ff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#e6e9f8' }}>
                          <Text style={{ fontSize: 28 }}>🎬</Text>
                        </View>
                        <Text style={{ marginTop: 8, fontSize: 13, color: '#374151' }}>{v.title}</Text>
                        <TouchableOpacity
                          style={[styles.addButton, { marginTop: 8, paddingVertical: 8 }]}
                          onPress={() => sendLCDCommand('play', { url: v.url })}
                        >
                          <Text style={styles.addButtonText}>재생</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </ScrollView>
                </View>

                {/* 2) 영상 업로드 */}
                <View style={{ marginTop: 14 }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', marginBottom: 8 }}>영상 업로드</Text>
                  <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                    <TouchableOpacity
                      style={[styles.addButton, { flex: 1 }]}
                      onPress={async () => {
                        try {
                          // 요청: 미디어 라이브러리 권한 (최신 Expo API 사용)
                          const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
                          let picked = null;

                          if (perm.status === 'granted') {
                            // 미디어 라이브러리에서 비디오 선택
                            const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Videos, quality: 0.8 });
                            picked = res && (res.assets ? res.assets[0] : res);
                          } else {
                            // 권한이 없거나 거부된 경우, DocumentPicker로 폴백하여 파일 선택을 시도
                            console.warn('Media library permission not granted, falling back to DocumentPicker');
                          }

                          // If no pick from ImagePicker, try DocumentPicker (works across platforms including web)
                          if (!picked || !picked.uri) {
                            const doc = await DocumentPicker.getDocumentAsync({ type: 'video/*' });
                            if (doc.type === 'success') {
                              // DocumentPicker returns { uri, name, size, mimeType? }
                              picked = { uri: doc.uri, name: doc.name };
                            } else {
                              // user canceled
                              return;
                            }
                          }

                          const uri = picked.uri || (picked.assets && picked.assets[0] && picked.assets[0].uri);
                          if (!uri) return;

                          // Prepare filename and mime
                          const filename = (picked.name && picked.name.split('/').pop()) || uri.split('/').pop();
                          const match = /\.(\w+)$/.exec(filename || '');
                          const ext = match ? match[1].toLowerCase() : 'mp4';
                          const mimeType = `video/${ext === 'mp4' ? 'mp4' : ext}`;

                          const form = new FormData();
                          // On React Native we must provide { uri, name, type }
                          form.append('video', { uri, name: filename || `upload.${ext}`, type: mimeType });

                          const uploadResp = await fetch('http://localhost:3000/upload/video', {
                            method: 'POST',
                            body: form,
                            // don't set Content-Type header here; fetch will add the correct multipart boundary
                          });

                          if (!uploadResp.ok) {
                            const t = await uploadResp.text();
                            console.warn('upload failed', uploadResp.status, t);
                            Alert.alert('업로드 실패', `서버 응답 ${uploadResp.status}`);
                            return;
                          }

                          const j = await uploadResp.json();
                          if (j && j.url) {
                            const fullUrl = `http://localhost:3000${j.url}`;
                            setLcdUrl(fullUrl);
                            Alert.alert('업로드 완료', '비디오가 서버에 업로드되었습니다.');
                          } else {
                            Alert.alert('업로드 실패', '서버가 업로드 URL을 반환하지 않았습니다.');
                          }
                        } catch (e) {
                          console.warn('video pick/upload failed', e);
                          Alert.alert('오류', '비디오 선택 또는 업로드에 실패했습니다.');
                        }
                      }}
                    >
                      <Text style={styles.addButtonText}>업로드 비디오 선택</Text>
                    </TouchableOpacity>
                  </View>
                  {lcdUrl ? (
                    <Text style={{ marginTop: 8, color: '#6b7280' }}>선택된 비디오: {lcdUrl}</Text>
                  ) : (
                    <Text style={{ marginTop: 8, color: '#6b7280' }}>업로드한 비디오가 없으면 여기에 경로가 표시됩니다.</Text>
                  )}
                </View>

                {/* 3) 영상 링크 (외부 URL) */}
                <View style={{ marginTop: 14 }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', marginBottom: 8 }}>영상 링크</Text>
                  <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                    <TextInput
                      value={lcdUrl}
                      onChangeText={setLcdUrl}
                      placeholder="https://.../video.mp4 또는 YouTube 링크"
                      style={[styles.inputBox, { flex: 1 }]}
                    />
                    <TouchableOpacity
                      style={[styles.addButton, { paddingVertical: 10 }]}
                      onPress={() => sendLCDCommand('set_url', { url: lcdUrl })}
                    >
                      <Text style={styles.addButtonText}>URL 설정</Text>
                    </TouchableOpacity>
                  </View>
                </View>

              </View>
            </View>

            <View style={{ flexDirection: 'row', marginTop: 20, gap: 8 }}>
              <TouchableOpacity style={[styles.addButton, { flex: 1 }]} onPress={handleSave}>
                <Text style={styles.addButtonText}>저장</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.addButton, { flex: 1, backgroundColor: '#ef4444' }]}
                onPress={() => navigation.goBack()}
              >
                <Text style={styles.addButtonText}>취소</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
      <BottomNav navigation={navigation} current={null} />
    </SafeAreaView>
  );
}

function TerrariumSettingsScreen({ navigation, terrariums, setTerrariums, activeIndex }) {
  const current = terrariums[activeIndex] || {};
  const [name, setName] = useState(current.name || "");
  const [plantType, setPlantType] = useState(current.plantType || "");
  const [waterAlert, setWaterAlert] = useState(current.waterAlert || false);
  const [lightAlert, setLightAlert] = useState(current.lightAlert || false);
  const [image, setImage] = useState(current.image || null);

  const pickImage = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== "granted") {
        Alert.alert("권한 필요", "갤러리 접근 권한이 필요합니다.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      // SDK 차이를 고려한 결과 처리
      if (result.canceled === true) return;
      const uri = result.assets && result.assets[0] ? result.assets[0].uri : result.uri;
      if (uri) setImage(uri);
    } catch (e) {
      console.warn("pickImage error", e);
    }
  };

  const confirmRemoveImage = () => {
    Alert.alert("이미지 삭제", "정말 이미지를 삭제하시겠습니까?", [
      { text: "취소", style: "cancel" },
      { text: "삭제", style: "destructive", onPress: () => setImage(null) },
    ]);
  };

  const handleSave = () => {
    const updated = [...terrariums];
    updated[activeIndex] = {
      ...(updated[activeIndex] || {}),
      name,
      plantType,
      waterAlert,
      lightAlert,
      image,
      // preserve existing sensor values from the current terrarium (avoid referencing undefined variables)
      temp: current.temp ?? (updated[activeIndex] && updated[activeIndex].temp) ?? null,
      hum: current.hum ?? (updated[activeIndex] && updated[activeIndex].hum) ?? null,
      lux: current.lux ?? (updated[activeIndex] && updated[activeIndex].lux) ?? null,
    };
    setTerrariums(updated);
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.screenBase}>
      <HeaderLogo />

      <ScrollView contentContainerStyle={styles.screenScroll}>
        <Text style={styles.sectionTitle}>테라리움 설정</Text>

        {/* 이름 설정 */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>이름 변경</Text>
          <View style={{ marginTop: 10 }}>
            <View style={styles.inputBox}>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="테라리움 이름 입력"
                style={{ fontSize: 14 }}
              />
            </View>
          </View>
        </View>

        {/* 이미지 설정 */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>테라리움 이미지</Text>
          <View style={{ marginTop: 10 }}>
            <View style={styles.terrariumImagePlaceholder}>
              {image ? (
                <>
                  <Image
                    source={{ uri: image }}
                    style={styles.terrariumImage}
                    resizeMode="cover"
                  />
                </>
              ) : (
                <Text style={{ color: "#64748b", fontSize: 12 }}>
                  이미지가 설정되어 있지 않습니다.
                </Text>
              )}
            </View>

            <View style={{ flexDirection: "row", marginTop: 12, gap: 8 }}>
              <TouchableOpacity
                style={[styles.addButton, { flex: 1 }]}
                onPress={pickImage}
              >
                <Text style={styles.addButtonText}>{image ? "이미지 변경" : "이미지 추가"}</Text>
              </TouchableOpacity>
              {image ? (
                <TouchableOpacity
                  style={[styles.addButton, { flex: 1, backgroundColor: "#ef4444" }]}
                  onPress={confirmRemoveImage}
                >
                  <Text style={styles.addButtonText}>이미지 삭제</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        </View>

        {/* 식물 타입 설정 */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>식물 종류</Text>

          <View style={styles.optionRow}>
            <TouchableOpacity
              style={[
                styles.optionButton,
                plantType === "허브류" && { backgroundColor: "#c5f1c9" },
              ]}
              onPress={() => setPlantType("허브류")}
            >
              <Text style={styles.optionText}>허브류</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.optionButton,
                plantType === "다육식물" && { backgroundColor: "#c5f1c9" },
              ]}
              onPress={() => setPlantType("다육식물")}
            >
              <Text style={styles.optionText}>다육식물</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.optionButton,
                plantType === "관엽식물" && { backgroundColor: "#c5f1c9" },
              ]}
              onPress={() => setPlantType("관엽식물")}
            >
              <Text style={styles.optionText}>관엽식물</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 알림 설정 */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>알림 설정</Text>

          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>물주기 알림</Text>
            <TouchableOpacity
              style={waterAlert ? styles.toggleSwitchOn : styles.toggleSwitchOff}
              onPress={() => setWaterAlert((prev) => !prev)}
            >
              <Text style={waterAlert ? styles.toggleTextOn : styles.toggleText}>
                {waterAlert ? "ON" : "OFF"}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>광량 부족 알림</Text>
            <TouchableOpacity
              style={lightAlert ? styles.toggleSwitchOn : styles.toggleSwitchOff}
              onPress={() => setLightAlert((prev) => !prev)}
            >
              <Text style={lightAlert ? styles.toggleTextOn : styles.toggleText}>
                {lightAlert ? "ON" : "OFF"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.addButton, { marginTop: 30 }]}
          onPress={handleSave}
        >
          <Text style={styles.addButtonText}>저장하기</Text>
        </TouchableOpacity>
      </ScrollView>

      <BottomNav navigation={navigation} current={null} />
    </SafeAreaView>
  );
}

/* ---------- 캘린더 화면 ---------- */
function CalendarScreen({ navigation, terrariums, setTerrariums, activeIndex }) {
  const [today] = useState(new Date());
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-based
  const [events, setEvents] = useState([]); // {id, date:'YYYY-MM-DD', time:'HH:MM', title, actionKey}
  const [selectedDate, setSelectedDate] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formTime, setFormTime] = useState('12:00');
  const ACTIONS = [
    { key: 'heater_on', label: '히터 ON' },
    { key: 'heater_off', label: '히터 OFF' },
    { key: 'vent_on', label: '환기 ON' },
    { key: 'vent_off', label: '환기 OFF' },
    { key: 'water_pump_on', label: '워터펌프 ON' },
    { key: 'water_pump_off', label: '워터펌프 OFF' },
    { key: 'grow_light_on', label: '조명 ON' },
    { key: 'grow_light_off', label: '조명 OFF' },
  ];
  const [selectedAction, setSelectedAction] = useState(ACTIONS[0].key);

  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0..6 (Sun..Sat)
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const pad = [];
  for (let i = 0; i < firstDayOfMonth; i++) pad.push(null);
  const days = [...pad, ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  useEffect(() => {
    // fetch events from server if available
    const load = async () => {
      try {
        const resp = await fetch(`http://localhost:3000/api/events?terrariumId=${activeIndex}`);
        if (resp.ok) {
          const data = await resp.json();
          setEvents(data || []);
          return;
        }
      } catch (e) {
        // ignore and keep local
      }
    };
    load();
  }, [activeIndex]);

  const openDay = (d) => {
    const yyyy = year;
    const mm = String(month + 1).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    const iso = `${yyyy}-${mm}-${dd}`;
    setSelectedDate(iso);
    setFormTitle('');
    setFormTime('12:00');
    setSelectedAction(ACTIONS[0].key);
    setModalOpen(true);
  };

  const eventsForDate = (iso) => events.filter((e) => e.date === iso);

  const saveEvent = async () => {
    if (!selectedDate) return;
    const evBody = { terrariumId: String(activeIndex), date: selectedDate, time: formTime, title: formTitle || '작업', actionKey: selectedAction };
    try {
      const resp = await fetch('http://localhost:3000/api/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(evBody) });
      if (resp.ok) {
        const saved = await resp.json();
        setEvents((s) => [...s, saved]);
        setModalOpen(false);
        return;
      }
    } catch (e) {
      console.warn('saveEvent failed, falling back to local', e);
    }

    // fallback to local-only
    const id = `${selectedDate}-${Date.now()}`;
    const ev = { id, date: selectedDate, time: formTime, title: formTitle || '작업', actionKey: selectedAction };
    setEvents((s) => [...s, ev]);
    setModalOpen(false);
  };

  const sendNow = async (actionKey) => {
    try {
      const resp = await fetch('http://localhost:3000/devices/control', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ actionKey, id: activeIndex })
      });
      if (resp.ok) {
        Alert.alert('명령 전송', `${actionKey} 명령을 전송했습니다.`);
      } else {
        Alert.alert('전송 실패', `서버 응답 ${resp.status}`);
      }
    } catch (e) {
      console.warn('sendNow failed', e);
      Alert.alert('네트워크 오류', '명령 전송에 실패했습니다.');
    }
  };

  return (
    <SafeAreaView style={styles.screenBase}>
      <HeaderLogo />
      <ScrollView contentContainerStyle={styles.screenScroll}>
        <Text style={styles.sectionTitle}>캘린더</Text>

        <View style={[styles.card, { marginTop: 12 }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <TouchableOpacity onPress={() => { const m = month - 1; if (m < 0) { setYear(year - 1); setMonth(11); } else setMonth(m); }}>
              <Text style={{ fontSize: 20 }}>‹</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 16, fontWeight: '700' }}>{year}년 {month + 1}월</Text>
            <TouchableOpacity onPress={() => { const m = month + 1; if (m > 11) { setYear(year + 1); setMonth(0); } else setMonth(m); }}>
              <Text style={{ fontSize: 20 }}>›</Text>
            </TouchableOpacity>
          </View>

          <View style={{ marginTop: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              {['일','월','화','수','목','금','토'].map((d) => (
                <Text key={d} style={{ width: 36, textAlign: 'center', color: '#6b7280' }}>{d}</Text>
              ))}
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }}>
              {days.map((d, i) => (
                <TouchableOpacity key={i} onPress={() => d && openDay(d)} style={{ width: `${100/7}%`, padding: 6 }}>
                  <View style={{ alignItems: 'center', justifyContent: 'center', borderRadius: 8, paddingVertical: 8, backgroundColor: d ? '#fff' : 'transparent' }}>
                    {d ? <Text style={{ color: '#111827' }}>{d}</Text> : <Text>&nbsp;</Text>}
                    {d ? (
                      (() => {
                        const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                        const cnt = eventsForDate(iso).length;
                        return cnt > 0 ? <View style={{ marginTop: 6, backgroundColor: '#fde68a', paddingHorizontal: 6, borderRadius: 6 }}><Text style={{ fontSize: 11 }}>{cnt}개</Text></View> : null;
                      })()
                    ) : null}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <View style={[styles.card, { marginTop: 16 }]}>
          <Text style={styles.cardTitle}>오늘의 예약</Text>
          <View style={{ marginTop: 8 }}>
            {events.length === 0 ? (
              <Text style={{ color: '#6b7280' }}>예약이 없습니다. 날짜를 눌러 예약을 추가하세요.</Text>
            ) : (
              events.slice().sort((a,b)=> a.date.localeCompare(b.date) || a.time.localeCompare(b.time)).map((ev) => (
                <View key={ev.id} style={{ marginBottom: 8, padding: 8, borderRadius: 8, backgroundColor: '#f8fafc', borderWidth:1, borderColor:'#e5e7eb' }}>
                  <Text style={{ fontWeight: '700' }}>{ev.title}</Text>
                  <Text style={{ color: '#6b7280' }}>{ev.date} {ev.time} · {ev.actionKey}</Text>
                  <View style={{ flexDirection: 'row', marginTop: 8, gap: 8 }}>
                    <TouchableOpacity style={[styles.addButton, { paddingVertical: 8, flex: 1 }]} onPress={() => sendNow(ev.actionKey)}>
                      <Text style={styles.addButtonText}>지금 실행</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.addButton, { paddingVertical: 8, backgroundColor: '#ef4444', flex: 1 }]} onPress={async () => {
                      // delete from server if possible
                      try {
                        if (ev._id) {
                          const resp = await fetch(`http://localhost:3000/api/events/${ev._id}`, { method: 'DELETE' });
                          if (resp.ok || resp.status === 204) {
                            setEvents((s) => s.filter(x => x._id !== ev._id));
                            return;
                          }
                        }
                      } catch (e) {
                        console.warn('delete event failed', e);
                      }
                      // fallback to local id removal
                      setEvents((s) => s.filter(x => x.id !== ev.id && x._id !== ev._id));
                    }}>
                      <Text style={styles.addButtonText}>삭제</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        </View>

      </ScrollView>

      <Modal visible={modalOpen} animationType="slide" transparent={true}>
        <View style={{ flex:1, backgroundColor:'rgba(0,0,0,0.4)', justifyContent:'center', padding:20 }}>
          <View style={{ backgroundColor:'#fff', borderRadius:12, padding:16 }}>
            <Text style={{ fontSize:16, fontWeight:'700' }}>예약 추가</Text>
            <Text style={{ color:'#6b7280', marginTop:6 }}>{selectedDate}</Text>
            <TextInput placeholder="제목" value={formTitle} onChangeText={setFormTitle} style={[styles.inputBox, { marginTop: 10 }]} />
            <TextInput placeholder="시간 (HH:MM)" value={formTime} onChangeText={setFormTime} style={[styles.inputBox, { marginTop: 8 }]} />
            <View style={{ marginTop: 8 }}>
              <Text style={{ marginBottom: 6, color:'#374151' }}>동작</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {ACTIONS.map((a) => (
                  <TouchableOpacity key={a.key} onPress={() => setSelectedAction(a.key)} style={{ paddingHorizontal: 8, paddingVertical:6, borderRadius:8, backgroundColor: selectedAction === a.key ? '#145c35' : '#f1f5f9' }}>
                    <Text style={{ color: selectedAction === a.key ? '#fff' : '#111827' }}>{a.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={{ flexDirection: 'row', marginTop: 14, gap: 8 }}>
              <TouchableOpacity style={[styles.addButton, { flex: 1 }]} onPress={saveEvent}><Text style={styles.addButtonText}>저장</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.addButton, { flex: 1, backgroundColor: '#ef4444' }]} onPress={() => setModalOpen(false)}><Text style={styles.addButtonText}>취소</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

/* ---------- WebCam view component (web: navigator.mediaDevices, native: placeholder) ---------- */
function WebCamView() {
  const videoRef = useRef(null);

  useEffect(() => {
    let stream = null;
    if (Platform.OS === "web" && typeof navigator !== "undefined" && navigator.mediaDevices) {
      const start = async () => {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          if (videoRef.current) {
            // @ts-ignore - web video element
            videoRef.current.srcObject = stream;
            // autoplay may require a user gesture; playsInline helps on mobile web
            try {
              videoRef.current.play && videoRef.current.play();
            } catch (e) {
              // ignore play errors
            }
          }
        } catch (e) {
          console.warn("getUserMedia error:", e);
        }
      };
      start();
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  if (Platform.OS === "web") {
    // Using a plain <video> element works on web (expo web / react-native-web will render it into DOM).
    return (
      // eslint-disable-next-line react-native/no-inline-styles
      <View style={{ width: "100%", height: 180, borderRadius: 12, overflow: "hidden" }}>
        {/* @ts-ignore */}
        <video
          ref={videoRef}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
          autoPlay
          playsInline
          muted
        />
      </View>
    );
  }

  return (
    <View style={{ width: "100%", height: 180, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ color: "#64748b", fontSize: 12, textAlign: "center" }}>
        모바일에서는 실시간 카메라 미리보기를 사용하려면 'expo-camera' 설치 및 권한 요청이 필요합니다.
      </Text>
    </View>
  );
}

/* ---------- App 루트: 여기서 상태 공유 ---------- */
export default function App() {
  const [terrariums, setTerrariums] = useState([
    {
      name: "로오즈마아리",
      plantType: "첫번째 정원",
      waterAlert: false,
      lightAlert: true,
      image: null,
      temp: 22,
      hum: 55,
      lux: 55,
    },
    { name: "민트정원", plantType: "허브류", waterAlert: true, lightAlert: false, image: null, temp: 20, hum: 60, lux: 40 },
    { name: "선인장방", plantType: "다육식물", waterAlert: false, lightAlert: true, image: null, temp: 26, hum: 30, lux: 80 },
  ]);
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Splash">
          {(props) => <SplashScreen {...props} />}
        </Stack.Screen>
        <Stack.Screen name="Home">
          {(props) => (
            <HomeScreen
              {...props}
              terrariums={terrariums}
              activeIndex={activeIndex}
              setActiveIndex={setActiveIndex}
              setTerrariums={setTerrariums}
            />
          )}
        </Stack.Screen>
        <Stack.Screen name="Calendar">
          {(props) => (
            <CalendarScreen
              {...props}
              terrariums={terrariums}
              setTerrariums={setTerrariums}
              activeIndex={activeIndex}
            />
          )}
        </Stack.Screen>
        <Stack.Screen name="Notification">
          {(props) => (
            <NotificationScreen
              {...props}
              terrariums={terrariums}
              setTerrariums={setTerrariums}
              activeIndex={activeIndex}
              setActiveIndex={setActiveIndex}
            />
          )}
        </Stack.Screen>
        <Stack.Screen name="User">
          {(props) => (
            <UserScreen
              {...props}
              terrariums={terrariums}
              setTerrariums={setTerrariums}
              activeIndex={activeIndex}
            />
          )}
        </Stack.Screen>
        <Stack.Screen name="TerrariumControl">
          {(props) => (
            <TerrariumControlScreen
              {...props}
              terrariums={terrariums}
              setTerrariums={setTerrariums}
              activeIndex={activeIndex}
            />
          )}
        </Stack.Screen>
        <Stack.Screen name="TerrariumSettings">
          {(props) => (
            <TerrariumSettingsScreen
              {...props}
              terrariums={terrariums}
              setTerrariums={setTerrariums}
              activeIndex={activeIndex}
            />
          )}
        </Stack.Screen>
        <Stack.Screen name="LightControl">
          {(props) => (
            <LightControlScreen
              {...props}
              terrariums={terrariums}
              setTerrariums={setTerrariums}
              activeIndex={activeIndex}
            />
          )}
        </Stack.Screen>
        <Stack.Screen name="Background">
          {(props) => <BackgroundScreen {...props} />}
        </Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
  );
}

/* ---------- 스타일 ---------- */
const styles = StyleSheet.create({
  screenBase: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  screenScroll: {
    paddingHorizontal: 20,
    paddingBottom: 160,
  },

  /* Splash */
  splashContainer: {
    flex: 1,
    backgroundColor: "#f5f5f0",
  },
  splashBackground: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  splashContent: {
    alignItems: "flex-start",
  },
  splashSubtitle: {
    fontSize: 16,
    color: "#334155",
    marginBottom: 2,
  },
  splashTitle: {
    fontSize: 40,
    fontWeight: "700",
    color: "#145c35",
    marginTop: 16,
    lineHeight: 44,
  },

  /* Header */
  headerRow: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
    backgroundColor: "#ffffff",
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#145c35",
    alignItems: "center",
    justifyContent: "center",
  },
  logoTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#145c35",
  },
  /* (탭 스타일 제거 — 이전 레이아웃으로 복원) */
  terrariumSubtitle: {
    fontSize: 12,
    color: "#9ca3af",
    marginTop: 2,
  },
  terrariumImagePlaceholder: {
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#cbd5e1",
    height: 150,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8fafc",
  },
  terrariumImage: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
  },
  terrariumCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e6eef3',
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 2,
  },
  terrariumHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  terrariumTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  carouselDots: {
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#e5e7eb",
    marginHorizontal: 2,
  },
  dotActive: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#22c55e",
  },

  addButton: {
    marginTop: 16,
    backgroundColor: "#15803d",
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: "center",
  },
  addButtonText: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 15,
  },

  sensorRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 18,
  },
  sensorRowCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },
  sensorCircleBox: {
    alignItems: "center",
    flex: 1,
  },
  sensorCircleOuter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  sensorCircleInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },
  sensorValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  sensorLabel: {
    marginTop: 8,
    fontSize: 13,
    color: "#4b5563",
  },

  /* Menu */
  menuContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  menuGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  menuTile: {
    width: "48%",
    aspectRatio: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#145c35",
    backgroundColor: "#ffffff",
    marginBottom: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  menuTileIcon: {
    fontSize: 28,
    marginBottom: 6,
  },
  menuTileLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#145c35",
  },

  /* Light control */
  sectionTitle: {
    marginTop: 12,
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },
  colorWheelPlaceholder: {
    marginTop: 16,
    alignSelf: "center",
    width: 250,
    height: 250,
    borderRadius: 125,
    borderWidth: 10,
    borderColor: "#e5e7eb",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fefce8",
  },
  card: {
    marginTop: 20,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 10,
    color: "#111827",
  },
  cardSubtitle: {
    fontSize: 13,
    color: "#4b5563",
    marginBottom: 8,
  },
  modeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  modeButton: {
    flex: 1,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    paddingVertical: 8,
    alignItems: "center",
    backgroundColor: "#f8fafc",
  },
  modeButtonActive: {
    backgroundColor: "#145c35",
    borderColor: "#145c35",
  },
  modeButtonText: {
    fontSize: 13,
    color: "#111827",
  },
  modeButtonTextActive: {
    fontSize: 13,
    color: "#ffffff",
    fontWeight: "600",
  },
  manualRow: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  sliderBar: {
    flex: 1,
    height: 6,
    borderRadius: 999,
    backgroundColor: "#e5e7eb",
    justifyContent: "center",
  },
  sliderThumb: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#145c35",
    position: "absolute",
    left: "60%",
  },
  colorCodeBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
  },
  colorPreview: {
    width: 16,
    height: 16,
    borderRadius: 3,
    backgroundColor: "#fbbf24",
  },
  colorCodeText: {
    fontSize: 12,
    color: "#111827",
    fontFamily: "monospace",
  },

  swatchRow: {
    flexDirection: "row",
    marginTop: 8,
    gap: 8,
  },
  swatch: {
    width: 40,
    height: 40,
    borderRadius: 8,
  },
  colorPreviewBox: {
    width: 36,
    height: 36,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  wheelNote: {
    fontSize: 12,
    color: "#64748b",
    textAlign: "center",
  },

  /* Background */
  bgSectionLabel: {
    marginTop: 16,
    marginBottom: 6,
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  bgItem: {
    marginBottom: 10,
    borderRadius: 12,
    overflow: "hidden",
  },
  bgImagePlaceholder: {
    height: 90,
    backgroundColor: "#145c35",
    alignItems: "flex-start",
    justifyContent: "flex-end",
    padding: 10,
  },

  /* Terrarium settings extra styles */
  inputBox: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#ffffff",
  },
  optionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 14,
  },
  optionButton: {
    flex: 1,
    marginHorizontal: 4,
    paddingVertical: 10,
    backgroundColor: "#f1f5f9",
    borderRadius: 10,
    alignItems: "center",
  },
  optionText: {
    fontSize: 13,
    color: "#334155",
  },
  menuHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  menuToggle: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  menuSubTitle: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 2,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  backButtonText: {
    fontSize: 20,
    color: "#334155",
  },
  menuDropdown: {
    position: "absolute",
    right: 20,
    top: 56,
    backgroundColor: "#ffffff",
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 4,
    zIndex: 50,
  },
  dropdownItemWrap: {
    paddingVertical: 6,
  },
  dropdownItem: {
    fontSize: 14,
    color: "#111827",
  },
  dropdownItemActive: {
    color: "#145c35",
    fontWeight: "700",
  },
  navButton: {
    position: "absolute",
    top: "45%",
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.9)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 4,
    zIndex: 40,
  },
  navButtonLeft: {
    left: 8,
  },
  navButtonRight: {
    right: 8,
  },
  navButtonText: {
    fontSize: 24,
    color: "#334155",
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "spaceBetween",
    marginTop: 12,
    alignItems: "center",
  },
  toggleLabel: {
    fontSize: 14,
    color: "#111827",
  },
  toggleSwitchOff: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: "#e2e8f0",
    borderRadius: 999,
  },
  toggleSwitchOn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: "#15803d",
    borderRadius: 999,
  },
  toggleText: {
    fontSize: 12,
    color: "#475569",
  },
  toggleTextOn: {
    fontSize: 12,
    color: "#ffffff",
    fontWeight: "600",
  },

  /* Bottom nav */
  bottomNav: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingBottom: 10,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    backgroundColor: "#ffffff",
  },
  bottomItem: {
    flex: 1,
    alignItems: "center",
  },
  bottomItemActive: {},
  bottomIcon: {
    fontSize: 18,
  },
  bottomLabel: {
    fontSize: 11,
    marginTop: 1,
    color: "#6b7280",
  },
  /* Icon toggle styles */
  iconToggle: {
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  iconToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  iconText: {
    fontSize: 18,
  },
  iconLabel: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
  },
  toggleKnob: {
    width: 46,
    height: 28,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleKnobOn: {
    backgroundColor: 'rgba(0,0,0,0.18)'
  },
  toggleKnobOff: {
    backgroundColor: 'rgba(255,255,255,0.9)'
  },
  toggleKnobText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  switchTrack: {
    justifyContent: 'center',
    padding: 4,
  },
  switchKnob: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
});
