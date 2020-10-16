CREATE FUNCTION `fn_send_attack` (i_username varchar(255), 
    i_from_x int, 
    i_from_y int,
    i_to_x int,
    i_to_y int,
    i_warriors int,
    i_ticks int)
RETURNS INTEGER
BEGIN
	DECLARE user_can_attack INT DEFAULT 0;
    DECLARE user_own_city INT DEFAULT 0;
    DECLARE city_exists INT DEFAULT 0;
    DECLARE attacking_user_id INT DEFAULT 0;
    DECLARE defending_user_id INT DEFAULT 0;
    
    SELECT 1, user_id INTO user_can_attack, attacking_user_id
    FROM tbl_user
    WHERE username = i_username
        AND food >= (i_warriors * 4)
        AND gold >= i_warriors
	;
    
    SELECT 1 INTO user_own_city
    FROM tbl_city
    WHERE x = i_from_x
		AND y = i_from_y
        AND owner_id = attacking_user_id
	;
    
    SELECT 1, owner_id INTO city_exists, defending_user_id
    FROM tbl_city
    WHERE x = i_to_x
		AND y = i_to_y
        AND owner_id <> attacking_user_id
	;
    
    IF user_can_attack = 0 THEN
		RETURN 1;
	END IF;
    
    IF user_own_city = 0 THEN
		RETURN 2;
	END IF;
    
    IF city_exists = 0 THEN
		RETURN 3;
	END IF;
    
    INSERT INTO tbl_attack(from_x, from_y, to_x, to_y, warrior, ticks, attack_from, attack_to)
    VALUES (i_from_x, i_from_y, i_to_x, i_to_y, i_warriors, i_ticks, attacking_user_id, defending_user_id);
    
    RETURN 0;
    
    
RETURN 1;
END
