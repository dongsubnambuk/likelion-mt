import React, { useState, useEffect } from 'react';
import { Users, Car, Clock, UserCheck, Eye, Settings, CheckCircle, Phone, MessageCircle } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, push, onValue, remove, get } from 'firebase/database';
import '../src/like.css'

// Firebase 설정
const firebaseConfig = {
  apiKey: "AIzaSyAxCMfbYKf6U5ltJFtWEy-_q3r_2tEUq2E",
  authDomain: "likelion-mt.firebaseapp.com",
  projectId: "likelion-mt",
  storageBucket: "likelion-mt.firebasestorage.app",
  messagingSenderId: "498388601892",
  appId: "1:498388601892:web:51ab5504d77537626f9cb1",
  measurementId: "G-WTDY735R7Z",
  databaseURL: "https://likelion-mt-default-rtdb.firebaseio.com/"
};

// Firebase 초기화
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

export default function CarAssignmentSystem() {
  // 운전자 목록
  const [drivers] = useState([
    { 
      id: 1, 
      name: '김운전', 
      maxCapacity: 5, 
      car: '소나타 (흰색)', 
      phone: '010-1234-5678',
      meetingPoint: '정문 앞',
      departureTime: '09:00'
    },
    { 
      id: 2, 
      name: '이드라이브', 
      maxCapacity: 4, 
      car: '아반떼 (검정)', 
      phone: '010-2345-6789',
      meetingPoint: '후문 주차장',
      departureTime: '09:00'
    },
    { 
      id: 3, 
      name: '박카', 
      maxCapacity: 5, 
      car: 'K5 (회색)', 
      phone: '010-3456-7890',
      meetingPoint: '정문 앞',
      departureTime: '09:00'
    },
    { 
      id: 4, 
      name: '최자동차', 
      maxCapacity: 4, 
      car: '말리부 (파랑)', 
      phone: '010-4567-8901',
      meetingPoint: '학생회관 앞',
      departureTime: '09:00'
    },
    { 
      id: 5, 
      name: '정운전자', 
      maxCapacity: 5, 
      car: '그랜저 (은색)', 
      phone: '010-5678-9012',
      meetingPoint: '후문 주차장',
      departureTime: '09:00'
    }
  ]);

  // 시스템 상태
  const [openTime, setOpenTime] = useState('2025-09-20T14:00');
  const [isOpen, setIsOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // 사용자 상태
  const [userInfo, setUserInfo] = useState({ name: '' });
  const [myAssignment, setMyAssignment] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // 차량별 탑승자 목록
  const [carAssignments, setCarAssignments] = useState(
    drivers.reduce((acc, driver) => {
      acc[driver.id] = [];
      return acc;
    }, {})
  );

  // 관리자 모드
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');

  // Firebase 초기화 및 운전자 정보 저장
  useEffect(() => {
    const initializeDrivers = async () => {
      const driversRef = ref(database, 'drivers');
      const snapshot = await get(driversRef);
      
      if (!snapshot.exists()) {
        // 운전자 정보가 없으면 초기 데이터 저장
        const driversData = {};
        drivers.forEach(driver => {
          driversData[driver.id] = driver;
        });
        await set(driversRef, driversData);
      }
    };

    // 설정 초기화
    const initializeSettings = async () => {
      const settingsRef = ref(database, 'settings');
      const snapshot = await get(settingsRef);
      
      if (!snapshot.exists()) {
        await set(settingsRef, {
          openTime: openTime,
          isOpen: false
        });
      } else {
        const settings = snapshot.val();
        setOpenTime(settings.openTime || openTime);
      }
    };

    initializeDrivers();
    initializeSettings();
  }, []);

  // Firebase에서 실시간 데이터 구독
  useEffect(() => {
    // 신청 내역 실시간 구독
    const assignmentsRef = ref(database, 'assignments');
    const unsubscribeAssignments = onValue(assignmentsRef, (snapshot) => {
      const assignments = snapshot.val() || {};
      
      // 차량별로 그룹화
      const grouped = drivers.reduce((acc, driver) => {
        acc[driver.id] = [];
        return acc;
      }, {});

      Object.entries(assignments).forEach(([key, assignment]) => {
        if (grouped[assignment.driverId]) {
          grouped[assignment.driverId].push({ ...assignment, key });
        }
      });

      setCarAssignments(grouped);

      // 내 신청 정보 확인
      if (userInfo.name) {
        const myAssignmentData = Object.values(assignments).find(
          assignment => assignment.name === userInfo.name
        );
        setMyAssignment(myAssignmentData || null);
      }
    });

    // 설정 실시간 구독
    const settingsRef = ref(database, 'settings');
    const unsubscribeSettings = onValue(settingsRef, (snapshot) => {
      const settings = snapshot.val();
      if (settings) {
        setOpenTime(settings.openTime);
        setIsOpen(settings.isOpen);
      }
    });

    return () => {
      unsubscribeAssignments();
      unsubscribeSettings();
    };
  }, [userInfo.name]);

  // 현재 시간 업데이트
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
      const openDateTime = new Date(openTime);
      const currentIsOpen = new Date() >= openDateTime;
      
      if (currentIsOpen !== isOpen) {
        // 오픈 상태가 변경되면 Firebase에 업데이트
        const settingsRef = ref(database, 'settings/isOpen');
        set(settingsRef, currentIsOpen);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [openTime, isOpen]);

  // Firebase에 신청 정보 저장
  const saveToFirebase = async (data) => {
    setIsLoading(true);
    try {
      const assignmentsRef = ref(database, 'assignments');
      const newAssignmentRef = push(assignmentsRef);
      await set(newAssignmentRef, data);
      return data;
    } catch (error) {
      console.error('Firebase 저장 오류:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // 빠른 신청
  const quickApply = async (driverId) => {
    if (!userInfo.name.trim()) {
      alert('이름을 입력해주세요!');
      return;
    }

    const driver = drivers.find(d => d.id === driverId);
    const currentPassengers = carAssignments[driverId] || [];
    
    // 운전자 포함해서 정원 체크 (현재 탑승자 + 운전자 1명 >= 최대 정원)
    if (currentPassengers.length + 1 >= driver.maxCapacity) {
      alert(`${driver.name}의 차량은 정원이 가득찼습니다!`);
      return;
    }

    // 이미 신청한 기록이 있는지 확인
    if (myAssignment) {
      alert('이미 다른 차량에 신청하셨습니다!');
      return;
    }

    // 같은 이름으로 이미 신청된 것이 있는지 전체 확인
    const allAssignments = Object.values(carAssignments).flat();
    const existingAssignment = allAssignments.find(assignment => assignment.name === userInfo.name.trim());
    if (existingAssignment) {
      alert('이미 신청된 이름입니다!');
      return;
    }

    const assignmentData = {
      name: userInfo.name.trim(),
      driverId: driverId,
      driverName: driver.name,
      car: driver.car,
      driverPhone: driver.phone,
      timestamp: new Date().toISOString(),
      meetingPoint: driver.meetingPoint,
      departureTime: driver.departureTime
    };

    try {
      await saveToFirebase(assignmentData);
      setMyAssignment(assignmentData);
      alert(`${driver.name}의 ${driver.car}에 성공적으로 신청되었습니다!`);
    } catch (error) {
      alert('신청 중 오류가 발생했습니다. 다시 시도해주세요.');
    }
  };

  // 신청 취소
  const cancelAssignment = async () => {
    if (!myAssignment) return;

    const confirmCancel = window.confirm('정말로 신청을 취소하시겠습니까?');
    if (!confirmCancel) return;

    setIsLoading(true);
    try {
      // Firebase에서 내 신청 찾아서 삭제
      const assignmentsRef = ref(database, 'assignments');
      const snapshot = await get(assignmentsRef);
      const assignments = snapshot.val() || {};
      
      const myAssignmentKey = Object.keys(assignments).find(
        key => assignments[key].name === myAssignment.name
      );
      
      if (myAssignmentKey) {
        const myAssignmentRef = ref(database, `assignments/${myAssignmentKey}`);
        await remove(myAssignmentRef);
      }
      
      setMyAssignment(null);
      alert('신청이 취소되었습니다.');
    } catch (error) {
      alert('취소 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 관리자 로그인
  const handleAdminLogin = () => {
    if (adminPassword === 'likelion2024') {
      setIsAdminMode(true);
      setAdminPassword('');
    } else {
      alert('비밀번호가 틀렸습니다.');
      setAdminPassword('');
    }
  };

  // 관리자: 오픈 시간 변경
  const updateOpenTime = async (newTime) => {
    try {
      const settingsRef = ref(database, 'settings');
      await set(settingsRef, {
        openTime: newTime,
        isOpen: new Date() >= new Date(newTime)
      });
      setOpenTime(newTime);
    } catch (error) {
      alert('설정 변경 중 오류가 발생했습니다.');
    }
  };

  // 관리자: 탑승자 제거
  const removePassenger = async (passengerKey) => {
    try {
      const assignmentRef = ref(database, `assignments/${passengerKey}`);
      await remove(assignmentRef);
    } catch (error) {
      alert('삭제 중 오류가 발생했습니다.');
    }
  };

  const totalAssigned = Object.values(carAssignments).reduce((sum, passengers) => 
    sum + passengers.length, 0
  ) + drivers.length; // 운전자 수 추가

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleString('ko-KR', {
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="container">
      {/* 헤더 */}
      <div className="header-card">
        <h1 className="header-title">
          <Car className="header-icon" />
          멋쟁이사자처럼 엠티 차량 신청
        </h1>
        
        <div className="header-info">
          <div className={`status-badge ${isOpen ? 'status-open' : 'status-closed'}`}>
            <Clock className="status-icon" />
            {isOpen ? '신청 가능' : `신청 시작: ${formatTime(openTime)}`}
          </div>
          <p className="time-info">현재 시간: {currentTime.toLocaleTimeString()}</p>
          <p className="count-info">총 신청 인원: {totalAssigned}명</p>
        </div>
      </div>

      {/* 내 신청 정보 */}
      {myAssignment && (
        <div className="my-assignment-card">
          <h2 className="section-title my-assignment-title">
            <CheckCircle className="section-icon" />
            내 신청 정보
          </h2>
          
          <div className="assignment-details">
            <div className="assignment-info">
              <div className="driver-info">
                <h3 className="driver-name">{myAssignment.driverName}의 차량</h3>
                <p className="info-item">🚗 {myAssignment.car}</p>
                <p className="info-item">📍 집합장소: {myAssignment.meetingPoint}</p>
                <p className="info-item">🕘 출발시간: {myAssignment.departureTime}</p>
                <p className="info-item">📅 신청시간: {new Date(myAssignment.timestamp).toLocaleString()}</p>
              </div>
              
              <div className="contact-buttons">
                <button
                  onClick={() => window.open(`tel:${myAssignment.driverPhone}`)}
                  className="contact-btn call-btn"
                >
                  <Phone className="btn-icon" />
                  운전자에게 전화하기
                </button>
                
                <button
                  onClick={() => window.open(`sms:${myAssignment.driverPhone}?body=안녕하세요, 엠티 탑승 예정인 ${myAssignment.name}입니다.`)}
                  className="contact-btn sms-btn"
                >
                  <MessageCircle className="btn-icon" />
                  문자 보내기
                </button>
                
                <button
                  onClick={cancelAssignment}
                  className="contact-btn cancel-btn"
                  disabled={isLoading}
                >
                  {isLoading ? '처리중...' : '신청 취소'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 간편 신청 폼 */}
      {!myAssignment && (
        <div className="form-card">
          <h2 className="section-title">
            <UserCheck className="section-icon" />
            빠른 신청
          </h2>
          
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">이름 *</label>
              <input
                type="text"
                value={userInfo.name}
                onChange={(e) => setUserInfo({ name: e.target.value })}
                placeholder="홍길동"
                className="form-input"
              />
            </div>
          </div>

          {!isOpen && (
            <div className="waiting-notice">
              <p className="waiting-text">
                🕐 신청은 {formatTime(openTime)}에 시작됩니다
              </p>
            </div>
          )}
        </div>
      )}

      {/* 차량 목록 */}
      <div className="cars-card">
        <h2 className="section-title">
          <Eye className="section-icon" />
          차량 정보 및 신청
        </h2>
        
        <div className="cars-list">
          {drivers.map(driver => {
            const passengers = carAssignments[driver.id] || [];
            const totalInCar = passengers.length + 1; // 운전자 포함
            const availableSeats = driver.maxCapacity - totalInCar;
            const isFull = availableSeats === 0;
            
            return (
              <div key={driver.id} className={`car-card ${isFull ? 'car-full' : 'car-available'}`}>
                <div className="car-content">
                  {/* 차량 정보 */}
                  <div className="car-info">
                    <div className="car-header">
                      <div className="driver-details">
                        <h3 className="driver-name">{driver.name}</h3>
                        <p className="car-detail">🚗 {driver.car}</p>
                        <p className="car-detail">📞 {driver.phone}</p>
                        <p className="car-detail">📍 {driver.meetingPoint}</p>
                        <p className="car-detail">🕘 {driver.departureTime} 출발</p>
                      </div>
                      <span className={`capacity-badge ${isFull ? 'capacity-full' : 'capacity-available'}`}>
                        {totalInCar}/{driver.maxCapacity}명
                      </span>
                    </div>
                    
                    {/* 탑승자 목록 */}
                    {totalInCar > 1 && (
                      <div className="passengers">
                        <p className="passengers-title">현재 탑승자:</p>
                        <div className="passengers-list">
                          <span className="passenger-tag driver-tag">
                            {driver.name} (운전자)
                          </span>
                          {passengers.map((passenger, idx) => (
                            <span key={idx} className="passenger-tag">
                              {passenger.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* 신청 버튼 */}
                  <div className="apply-section">
                    {!myAssignment && isOpen ? (
                      <button
                        onClick={() => quickApply(driver.id)}
                        disabled={isFull || isLoading}
                        className={`apply-btn ${isFull ? 'apply-disabled' : 'apply-active'}`}
                      >
                        {isLoading ? '신청중...' : isFull ? '마감' : '빠른 신청'}
                      </button>
                    ) : (
                      <div className="apply-status">
                        {myAssignment ? '신청 완료' : !isOpen ? '신청 대기' : ''}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 관리자 모드 */}
      <div className="admin-section">
        {!isAdminMode ? (
          <div className="admin-login">
            <input
              type="password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              placeholder="관리자 비밀번호"
              className="admin-input"
              onKeyPress={(e) => e.key === 'Enter' && handleAdminLogin()}
            />
            <button
              onClick={handleAdminLogin}
              className="admin-btn"
            >
              관리자 로그인
            </button>
          </div>
        ) : (
          <div className="admin-panel">
            <h2 className="section-title">
              <Settings className="section-icon" />
              관리자 패널
            </h2>
            
            <div className="admin-controls">
              <label className="form-label">신청 오픈 시간</label>
              <input
                type="datetime-local"
                value={openTime}
                onChange={(e) => updateOpenTime(e.target.value)}
                className="form-input"
              />
            </div>

            <div className="admin-status">
              <h3 className="status-title">전체 신청 현황</h3>
              {drivers.map(driver => {
                const passengers = carAssignments[driver.id] || [];
                
                return (
                  <div key={driver.id} className="status-card">
                    <h4 className="status-card-title">{driver.name}의 {driver.car} ({passengers.length + 1}/{driver.maxCapacity}명)</h4>
                    <div className="status-passengers">
                      {passengers.length === 0 ? (
                        <div className="passenger-info">
                          <div className="passenger-details">
                            <strong>{driver.name} (운전자)</strong> - {driver.phone}
                            <br />
                            <span className="timestamp">운전자</span>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="passenger-info">
                            <div className="passenger-details">
                              <strong>{driver.name} (운전자)</strong> - {driver.phone}
                              <br />
                              <span className="timestamp">운전자</span>
                            </div>
                          </div>
                          {passengers.map((passenger, idx) => (
                            <div key={idx} className="passenger-info">
                              <div className="passenger-details">
                                <strong>{passenger.name}</strong>
                                <br />
                                <span className="timestamp">신청시간: {new Date(passenger.timestamp).toLocaleString()}</span>
                              </div>
                              <button
                                onClick={() => removePassenger(passenger.key)}
                                className="remove-btn"
                              >
                                제거
                              </button>
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}