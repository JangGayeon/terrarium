import React, { useEffect, useState, useRef } from "react";
import {
  SafeAreaView,
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
} from "react-native";
import * as ImagePicker from "expo-image-picker";
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
function HomeScreen({ navigation, terrariums, activeIndex, setActiveIndex }) {
  const temp = 22;
  const hum = 55;
  const lux = 55;
  const CARD_WIDTH = Dimensions.get("window").width - 40;
  const scrollRef = useRef(null);
  const PAGE_GAP = 12; // marginRight used between cards
  const PAGE_WIDTH = CARD_WIDTH + PAGE_GAP;

  const goToIndex = (idx) => {
    if (!scrollRef.current) return;
    const clamped = Math.max(0, Math.min(idx, terrariums.length - 1));
    scrollRef.current.scrollTo({ x: clamped * PAGE_WIDTH, animated: true });
    setActiveIndex(clamped);
  };

  const goPrev = () => goToIndex(activeIndex - 1);
  const goNext = () => goToIndex(activeIndex + 1);

  return (
    <SafeAreaView style={styles.screenBase}>
      <StatusBar barStyle="dark-content" />
      <HeaderLogo />
      <ScrollView contentContainerStyle={styles.screenScroll}>
        {/* 테라리움 카드들: 가로 스와이프 캐러셀 */}
        <View style={{ position: "relative" }}>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          ref={scrollRef}
          onMomentumScrollEnd={(e) => {
            const x = e.nativeEvent.contentOffset.x;
            let idx = Math.round(x / PAGE_WIDTH);
            if (idx < 0) idx = 0;
            if (idx >= terrariums.length) idx = terrariums.length - 1;
            setActiveIndex(idx);
          }}
          contentContainerStyle={{ paddingHorizontal: 20 }}
        >
          {terrariums.map((t, idx) => (
            <View
              key={idx}
              style={[styles.terrariumCard, { width: CARD_WIDTH, marginRight: 12 }]}
            >
              <View style={styles.terrariumHeaderRow}>
                <View>
                  <Text style={styles.terrariumTitle}>{t.name}</Text>
                  <Text style={styles.terrariumSubtitle}>{t.plantType}</Text>
                </View>
                <TouchableOpacity onPress={() => navigation.navigate("TerrariumSettings")}>
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
                    <SensorCircle label="온도" value={`${t.temp ?? 0}°C`} color="#4ade80" />
                    <SensorCircle label="습도" value={`${t.hum ?? 0}%`} color="#22c55e" />
                    <SensorCircle label="조도" value={`${t.lux ?? 0} lx`} color="#facc15" />
                  </View>
                </View>
          ))}
        </ScrollView>

        {/* 이전/다음 버튼 (캐러셀 제어) */}
        <TouchableOpacity style={[styles.navButton, styles.navButtonLeft]} onPress={goPrev}>
          <Text style={styles.navButtonText}>‹</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.navButton, styles.navButtonRight]} onPress={goNext}>
          <Text style={styles.navButtonText}>›</Text>
        </TouchableOpacity>
        </View>

        {/* 캐러셀 점 표시: 카드 바깥(아래)에 하나만 렌더링 */}
        <View style={[styles.carouselDots, { marginTop: 12 }]}>
          {terrariums.map((_, i) => (
            <View key={i} style={[styles.dot, i === activeIndex && styles.dotActive]} />
          ))}
        </View>

        {/* + 추가하기 버튼 */}
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => Alert.alert("추가하기", "새 테라리움 추가 기능 예정")}
        >
          <Text style={styles.addButtonText}>+ 추가하기</Text>
        </TouchableOpacity>

        {/* 제어하기 버튼 */}
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: '#22c55e', marginTop: 12 }]}
          onPress={() => navigation.navigate("TerrariumControl")}
        >
          <Text style={[styles.addButtonText, { color: '#fff' }]}>제어하기</Text>
        </TouchableOpacity>
        
      </ScrollView>

      <BottomNav navigation={navigation} current="Home" />
    </SafeAreaView>
  );
}

function SensorCircle({ label, value, color }) {
  return (
    <View style={styles.sensorCircleBox}>
      <View style={[styles.sensorCircleOuter, { borderColor: color }]}>
        <View style={styles.sensorCircleInner}>
          <Text style={styles.sensorValue}>{value}</Text>
        </View>
      </View>
      <Text style={styles.sensorLabel}>{label}</Text>
    </View>
  );
}

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

/* ---------- 6. 테라리움 설정 화면 ---------- */
function TerrariumControlScreen({ navigation, terrariums, setTerrariums, activeIndex }) {
  const current = terrariums[activeIndex] || {};
  const [temp, setTemp] = useState(current.temp ?? 0);
  const [hum, setHum] = useState(current.hum ?? 0);
  const [lux, setLux] = useState(current.lux ?? 0);

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

  return (
    <SafeAreaView style={styles.screenBase}>
      <HeaderLogo />
      <ScrollView contentContainerStyle={styles.screenScroll}>
        <Text style={styles.sectionTitle}>테라리움 제어</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{current.name || "(선택된 테라리움 없음)"}</Text>
          <View style={{ marginTop: 10 }}>
            <View style={styles.terrariumImagePlaceholder}>
              {current.image ? (
                <Image source={{ uri: current.image }} style={styles.terrariumImage} resizeMode="cover" />
              ) : (
                <Text style={{ color: "#64748b", fontSize: 12 }}>이미지가 없습니다.</Text>
              )}
            </View>

            <View style={{ marginTop: 12 }}>
              <Text style={{ fontSize: 13, marginBottom: 6 }}>온도 (°C)</Text>
              <TextInput
                value={String(temp)}
                onChangeText={(v) => setTemp(Number(v.replace(/[^0-9-]/g, '')))}
                keyboardType="numeric"
                style={styles.inputBox}
              />
            </View>

            <View style={{ marginTop: 12 }}>
              <Text style={{ fontSize: 13, marginBottom: 6 }}>습도 (%)</Text>
              <TextInput
                value={String(hum)}
                onChangeText={(v) => setHum(Number(v.replace(/[^0-9]/g, '')))}
                keyboardType="numeric"
                style={styles.inputBox}
              />
            </View>

            <View style={{ marginTop: 12 }}>
              <Text style={{ fontSize: 13, marginBottom: 6 }}>조도 (lx)</Text>
              <TextInput
                value={String(lux)}
                onChangeText={(v) => setLux(Number(v.replace(/[^0-9]/g, '')))}
                keyboardType="numeric"
                style={styles.inputBox}
              />
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
      temp,
      hum,
      lux,
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
            />
          )}
        </Stack.Screen>
        <Stack.Screen name="Calendar">
          {(props) => (
            <View style={{flex:1,justifyContent:'center',alignItems:'center',backgroundColor:'#f8fafc'}}>
              <HeaderLogo />
              <Text style={{fontSize:24,marginTop:40}}>캘린더 (준비중)</Text>
            </View>
          )}
        </Stack.Screen>
        <Stack.Screen name="Notification">
          {(props) => (
            <View style={{flex:1,justifyContent:'center',alignItems:'center',backgroundColor:'#f8fafc'}}>
              <HeaderLogo />
              <Text style={{fontSize:24,marginTop:40}}>알림 (준비중)</Text>
            </View>
          )}
        </Stack.Screen>
        <Stack.Screen name="User">
          {(props) => (
            <View style={{flex:1,justifyContent:'center',alignItems:'center',backgroundColor:'#f8fafc'}}>
              <HeaderLogo />
              <Text style={{fontSize:24,marginTop:40}}>사용자 (준비중)</Text>
            </View>
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
    paddingBottom: 80,
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

  /* Home – terrarium card */
  terrariumCard: {
    marginTop: 16,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  terrariumHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  terrariumTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
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
    height: 180,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8fafc",
  },
  terrariumImage: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
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
});
